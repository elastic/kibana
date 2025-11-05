/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
} from '@kbn/rule-data-utils';

export interface ClearAlertFlappingHistoryParams {
  indices: string[];
  ruleIds: string[];
}

interface ClearAlertFlappingHistoryParamsWithDeps extends ClearAlertFlappingHistoryParams {
  logger: Logger;
  esClient: ElasticsearchClient;
}

const clearAlertFlappingHistoryQuery = (ruleIds: string[]): QueryDslQueryContainer => {
  const shouldStatusTerms = [ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED].map((status) => {
    return {
      term: {
        [ALERT_STATUS]: { value: status },
      },
    };
  });

  const shouldRuleIdsTerms = ruleIds.map((ruleId) => {
    return {
      term: {
        [ALERT_RULE_UUID]: { value: ruleId },
      },
    };
  });

  return {
    bool: {
      must: [
        {
          bool: {
            should: shouldStatusTerms,
          },
        },
        {
          bool: {
            should: shouldRuleIdsTerms,
          },
        },
      ],
    },
  };
};

export const clearAlertFlappingHistory = async (
  params: ClearAlertFlappingHistoryParamsWithDeps
) => {
  const { indices, ruleIds, esClient, logger } = params;

  if (!ruleIds.length || !indices.length) {
    throw new Error('Rule Ids and indices must be provided');
  }

  try {
    let total = 0;

    for (let retryCount = 0; retryCount < 3; retryCount++) {
      const response = await esClient.updateByQuery({
        index: indices,
        allow_no_indices: true,
        conflicts: 'proceed',
        script: {
          source: `
            ctx._source['${ALERT_FLAPPING}'] = false;
            ctx._source['${ALERT_FLAPPING_HISTORY}'] = new ArrayList();
          `,
          lang: 'painless',
        },
        query: clearAlertFlappingHistoryQuery(ruleIds),
        refresh: true,
      });

      if (total === 0 && response.total === 0) {
        logger.debug('No active or recovered alerts matched the query');
        break;
      }

      if (response.total) {
        total = response.total;
      }

      if (response.total === response.updated) {
        break;
      }

      logger.warn(
        `Attempt ${retryCount + 1}: Failed to clear flapping ${
          (response.total ?? 0) - (response.updated ?? 0)
        } of ${response.total}; indices: ${indices}, ruleIds: ${ruleIds}
        }`
      );
    }

    if (total === 0) {
      return [];
    }
  } catch (err) {
    logger.error(
      `Error clearing alert flapping for indices: ${indices}, ruleIds: ${ruleIds} - ${err.message}`
    );
    throw err;
  }
};
