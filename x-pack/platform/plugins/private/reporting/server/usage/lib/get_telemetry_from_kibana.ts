/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
  AggregationsBuckets,
  MappingRuntimeFieldType,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ReportingUsage } from '../types';
import { parseAndLogError } from './parse_and_log_error';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../../saved_objects';

interface Opts {
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
}

type GetTotalCountsResults = Pick<
  ReportingUsage,
  | 'number_of_scheduled_reports'
  | 'number_of_scheduled_reports_by_type'
  | 'number_of_enabled_scheduled_reports'
  | 'number_of_enabled_scheduled_reports_by_type'
  | 'number_of_scheduled_reports_with_notifications'
> & { errorMessage?: string; hasErrors: boolean };

export async function getTotalCountAggregations({
  esClient,
  index,
  logger,
}: Opts): Promise<GetTotalCountsResults> {
  try {
    const query = {
      index,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          // Aggregate over all scheduled report saved objects
          filter: [{ term: { type: SCHEDULED_REPORT_SAVED_OBJECT_TYPE } }],
        },
      },
      runtime_mappings: {
        'scheduled_report.enabled': {
          type: 'boolean' as MappingRuntimeFieldType,
        },
        'scheduled_report.jobType': {
          type: 'keyword' as MappingRuntimeFieldType,
        },
        'scheduled_report.notification.email.to': {
          type: 'keyword' as MappingRuntimeFieldType,
        },
      },
      aggs: {
        by_job_type: {
          terms: {
            field: 'scheduled_report.jobType',
            size: 20,
          },
        },
        enabled: {
          filter: { term: { 'scheduled_report.enabled': true } },
          aggs: {
            by_job_type: {
              terms: {
                field: 'scheduled_report.jobType',
                size: 20,
              },
            },
          },
        },
        has_notifications: {
          filter: { exists: { field: 'scheduled_report.notification.email.to' } },
        },
      },
    };

    logger.debug(() => `query for getTotalCountAggregations - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(() => `results for getTotalCountAggregations query - ${JSON.stringify(results)}`);

    const aggregations = results.aggregations as {
      by_job_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      enabled: {
        doc_count: number;
        by_job_type: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      };
      has_notifications: { doc_count: number };
    };

    const totalReportsCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const countReportsByJobType = parseJobTypeBucket(aggregations.by_job_type.buckets);
    const countEnabledReportsByJobType = parseJobTypeBucket(
      aggregations.enabled.by_job_type.buckets
    );

    return {
      hasErrors: false,
      number_of_scheduled_reports: totalReportsCount ?? 0,
      number_of_enabled_scheduled_reports: aggregations.enabled.doc_count ?? 0,
      number_of_scheduled_reports_by_type: countReportsByJobType,
      number_of_enabled_scheduled_reports_by_type: countEnabledReportsByJobType,
      number_of_scheduled_reports_with_notifications: aggregations.has_notifications.doc_count ?? 0,
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getTotalCountAggregations`, logger);
    return {
      hasErrors: true,
      errorMessage,
      number_of_scheduled_reports: 0,
      number_of_enabled_scheduled_reports: 0,
      number_of_scheduled_reports_by_type: {},
      number_of_enabled_scheduled_reports_by_type: {},
      number_of_scheduled_reports_with_notifications: 0,
    };
  }
}

export function parseJobTypeBucket(
  jobTypeBuckets: AggregationsBuckets<AggregationsStringTermsBucketKeys>
) {
  const buckets = jobTypeBuckets as AggregationsStringTermsBucketKeys[];
  return (buckets ?? []).reduce((acc, bucket: AggregationsStringTermsBucketKeys) => {
    const jobType: string = `${bucket.key}`;
    acc[jobType] = bucket.doc_count ?? 0;
    return acc;
  }, {} as Record<string, number>);
}
