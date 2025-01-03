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
    const errorMessage = err && err.message ? err.message : err.toString();
    let returnedErrorMessage = errorMessage;
    const errorStr = JSON.stringify(err);
    const logMessage = `Error executing alerting telemetry task: getTotalAlertsCountAggregations - ${err}`;
    const logOptions = {
      tags: ['alerting', 'telemetry-failed'],
      error: { stack_trace: err.stack },
    };

    // If error string contains "no_shard_available_action_exception", debug log it
    if (errorStr.includes('no_shard_available_action_exception')) {
      // the no_shard_available_action_exception can be wordy and the error message returned from this function
      // gets stored in the task state so lets simplify
      returnedErrorMessage = 'no_shard_available_action_exception';
      if (logger.isLevelEnabled('debug')) {
        logger.debug(logMessage, logOptions);
      }
    } else {
      logger.warn(logMessage, logOptions);
    }

    return {
      hasErrors: true,
      errorMessage: returnedErrorMessage,
      count_alerts_total: 0,
      count_alerts_by_rule_type: {},
    };
  }
}
