/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import type { MlAnomalyDetectionJobsHealthRuleParams } from '@kbn/ml-common-types/alerts';
import { ML_ALERT_TYPES } from '@kbn/ml-common-constants/alerts';
import { GLOBAL_CALENDAR } from '../../common/constants/calendars';
import { getResultJobsHealthRuleConfig } from '../../common/util/alerts';
import {
  aggregateCustomRulesUsageFromJobs,
  type MlCustomRulesUsage,
} from './custom_rules_usage_aggregation';
import {
  aggregateCalendarsUsage,
  attachEventsToCalendars,
  emptyCalendarsUsage,
  type MlCalendarsUsage,
  type MlGetCalendarsCalendarItem,
} from './calendars_usage_aggregation';
import {
  aggregateFilterListsUsage,
  type MlFilterListsUsage,
} from './filter_lists_usage_aggregation';
import type { MlJob } from '..';
import { mlUsageCollectorSchema } from './schema';

export type {
  MlCustomRulesUsage,
  MlCalendarsUsage,
  MlGetCalendarsCalendarItem,
  MlFilterListsUsage,
};

export interface MlUsageData {
  alertRules: {
    'xpack.ml.anomaly_detection_alert': {
      count_by_result_type: {
        record: number;
        bucket: number;
        influencer: number;
      };
      count_with_kql_filter: {
        record: number;
        influencer: number;
      };
    };
    'xpack.ml.anomaly_detection_jobs_health': {
      count_by_check_type: {
        datafeed: number;
        mml: number;
        delayedData: number;
        errorMessages: number;
      };
    };
  };
  custom_rules: MlCustomRulesUsage;
  calendars: MlCalendarsUsage;
  filter_lists: MlFilterListsUsage;
}

async function fetchAlertRulesUsage(
  esClient: ElasticsearchClient,
  alertIndex: string
): Promise<MlUsageData['alertRules'][typeof ML_ALERT_TYPES.ANOMALY_DETECTION]> {
  const result = await esClient.search(
    {
      index: alertIndex,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { type: 'alert' } },
            { term: { 'alert.alertTypeId': ML_ALERT_TYPES.ANOMALY_DETECTION } },
          ],
        },
      },
      aggs: {
        count_by_result_type: {
          terms: { field: 'alert.params.resultType', size: 3 },
          aggs: {
            with_kql_filter: {
              filter: { exists: { field: 'alert.params.kqlQueryString' } },
            },
          },
        },
      },
    },
    { maxRetries: 0 }
  );

  const aggResponse = result.aggregations as {
    count_by_result_type: {
      buckets: Array<{
        key: MlAnomalyResultType;
        doc_count: number;
        with_kql_filter: { doc_count: number };
      }>;
    };
  };

  const countByResultType =
    {} as MlUsageData['alertRules'][typeof ML_ALERT_TYPES.ANOMALY_DETECTION]['count_by_result_type'];
  const countWithKqlFilter =
    {} as MlUsageData['alertRules'][typeof ML_ALERT_TYPES.ANOMALY_DETECTION]['count_with_kql_filter'];

  for (const bucket of aggResponse.count_by_result_type.buckets) {
    countByResultType[bucket.key] = bucket.doc_count;
    // KQL filter is only available for record and influencer result types
    if (bucket.key !== 'bucket') {
      countWithKqlFilter[bucket.key] = bucket.with_kql_filter.doc_count;
    }
  }

  return { count_by_result_type: countByResultType, count_with_kql_filter: countWithKqlFilter };
}

async function fetchJobsHealthUsage(
  esClient: ElasticsearchClient,
  alertIndex: string
): Promise<MlUsageData['alertRules'][typeof ML_ALERT_TYPES.AD_JOBS_HEALTH]> {
  const jobsHealthRuleInstances = await esClient.search<{
    alert: { params: MlAnomalyDetectionJobsHealthRuleParams };
  }>(
    {
      index: alertIndex,
      size: 10000,
      query: {
        bool: {
          filter: [
            { term: { type: 'alert' } },
            { term: { 'alert.alertTypeId': ML_ALERT_TYPES.AD_JOBS_HEALTH } },
          ],
        },
      },
    },
    { maxRetries: 0 }
  );

  const resultsByCheckType = jobsHealthRuleInstances.hits.hits.reduce(
    (acc, curr) => {
      const doc = curr._source;
      if (!doc) return acc;

      const {
        alert: {
          params: { testsConfig },
        },
      } = doc;

      const resultConfig = getResultJobsHealthRuleConfig(testsConfig);

      acc.datafeed += resultConfig.datafeed.enabled ? 1 : 0;
      acc.mml += resultConfig.mml.enabled ? 1 : 0;
      acc.delayedData += resultConfig.delayedData.enabled ? 1 : 0;
      acc.errorMessages += resultConfig.errorMessages.enabled ? 1 : 0;

      return acc;
    },
    { datafeed: 0, mml: 0, delayedData: 0, errorMessages: 0 }
  );

  return { count_by_check_type: resultsByCheckType };
}

async function fetchCalendarsUsage(esClient: ElasticsearchClient): Promise<MlCalendarsUsage> {
  const [{ calendars = [] }, { events = [] }] = await Promise.all([
    esClient.ml.getCalendars({ page: { from: 0, size: 10000 } }),
    esClient.ml
      .getCalendarEvents({ calendar_id: GLOBAL_CALENDAR, size: 10000 }, { maxRetries: 0 })
      .catch(() => ({ events: [] })),
  ]);

  return aggregateCalendarsUsage(attachEventsToCalendars(calendars, events));
}

export function registerCollector(
  usageCollection: UsageCollectionSetup,
  getIndexForType: (type: string) => Promise<string>
) {
  const collector = usageCollection.makeUsageCollector<MlUsageData>({
    type: 'ml',
    schema: mlUsageCollectorSchema,
    isReady: () => true,
    fetch: async ({ esClient }) => {
      const alertIndex = await getIndexForType('alert');

      const [alertRulesResult, jobsHealthResult, jobsResult, calendarsResult, filtersResult] =
        await Promise.allSettled([
          fetchAlertRulesUsage(esClient, alertIndex),
          fetchJobsHealthUsage(esClient, alertIndex),
          esClient.ml.getJobs().then((r) => r.jobs ?? []),
          fetchCalendarsUsage(esClient),
          esClient.ml.getFilters({ size: 10000 }).then((r) => r.filters ?? []),
        ]);

      const jobs: MlJob[] = jobsResult.status === 'fulfilled' ? jobsResult.value : [];
      const filters = filtersResult.status === 'fulfilled' ? filtersResult.value : [];

      return {
        // camelCase for backwards compatibility; use snake_case for new fields
        alertRules: {
          [ML_ALERT_TYPES.ANOMALY_DETECTION]:
            alertRulesResult.status === 'fulfilled'
              ? alertRulesResult.value
              : {
                  count_by_result_type: { record: 0, bucket: 0, influencer: 0 },
                  count_with_kql_filter: { record: 0, influencer: 0 },
                },
          [ML_ALERT_TYPES.AD_JOBS_HEALTH]:
            jobsHealthResult.status === 'fulfilled'
              ? jobsHealthResult.value
              : { count_by_check_type: { datafeed: 0, mml: 0, delayedData: 0, errorMessages: 0 } },
        },
        calendars:
          calendarsResult.status === 'fulfilled' ? calendarsResult.value : emptyCalendarsUsage(),
        custom_rules: aggregateCustomRulesUsageFromJobs(jobs),
        filter_lists: aggregateFilterListsUsage(filters, jobs),
      };
    },
  });

  usageCollection.registerCollector(collector);
}
