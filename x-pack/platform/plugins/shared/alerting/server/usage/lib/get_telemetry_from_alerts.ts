/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { NUM_ALERTING_RULE_TYPES } from '../alerting_usage_collector';
import { parseSimpleRuleTypeBucket } from './parse_simple_rule_type_bucket';
import { AlertingUsage } from '../types';
import { parseAndLogError } from './parse_and_log_error';

interface Opts {
  esClient: ElasticsearchClient;
  logger: Logger;
}

type GetTotaAlertsCountsResults = Pick<
  AlertingUsage,
  'count_alerts_total' | 'count_alerts_by_rule_type'
> & {
  errorMessage?: string;
  hasErrors: boolean;
};

export const AAD_INDEX_PATTERN = '.alerts-*';

export async function getTotalAlertsCountAggregations({
  esClient,
  logger,
}: Opts): Promise<GetTotaAlertsCountsResults> {
  try {
    const query = {
      index: AAD_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          match_all: {},
        },
        aggs: {
          by_rule_type_id: {
            terms: {
              field: 'kibana.alert.rule.rule_type_id',
              size: NUM_ALERTING_RULE_TYPES,
            },
          },
        },
      },
    };

    logger.debug(() => `query for getTotalAlertsCountAggregations - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);
    logger.debug(
      () => `results for getTotalAlertsCountAggregations query - ${JSON.stringify(results)}`
    );

    const totalAlertsCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const aggregations = results.aggregations as {
      by_rule_type_id: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
    };

    return {
      hasErrors: false,
      count_alerts_total: totalAlertsCount ?? 0,
      count_alerts_by_rule_type: parseSimpleRuleTypeBucket(aggregations?.by_rule_type_id?.buckets),
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getTotalAlertsCountAggregations`, logger);

    return {
      hasErrors: true,
      errorMessage,
      count_alerts_total: 0,
      count_alerts_by_rule_type: {},
    };
  }
}
