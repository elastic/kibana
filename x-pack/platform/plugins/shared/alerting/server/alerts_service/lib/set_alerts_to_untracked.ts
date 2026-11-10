/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import Boom from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AlertStatus } from '@kbn/rule-data-utils';
import {
  ALERT_END,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_UNTRACKED,
  ALERT_TIME_RANGE,
  ALERT_TRACKED,
  ALERT_UUID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RulesClientContext } from '../../rules_client';
import { AlertingAuthorizationEntity } from '../../authorization/types';

export type BulkEnsureAuthorizedForUntrack = (opts: {
  ruleTypeIdConsumersPairs: Array<{ ruleTypeId: string; consumers: string[] }>;
}) => Promise<unknown>;

export interface SetAlertsToUntrackedParams {
  indices?: string[];
  ruleIds?: string[];
  alertUuids?: string[];
  query?: QueryDslQueryContainer[];
  spaceId?: RulesClientContext['spaceId'];
  ruleTypeIds?: string[];
  isUsingQuery?: boolean;
  getAllAuthorizedRuleTypesFindOperation?: RulesClientContext['authorization']['getAllAuthorizedRuleTypesFindOperation'];
  getAlertIndicesAlias?: RulesClientContext['getAlertIndicesAlias'];
  bulkEnsureAuthorized?: BulkEnsureAuthorizedForUntrack;
}

interface SetAlertsToUntrackedParamsWithDep extends SetAlertsToUntrackedParams {
  logger: Logger;
  esClient: ElasticsearchClient;
}

type UntrackedAlertsResult = Array<{ [ALERT_RULE_UUID]: string; [ALERT_UUID]: string }>;

type RuleTypeIdConsumersPairs =
  Parameters<BulkEnsureAuthorizedForUntrack>[0]['ruleTypeIdConsumersPairs'];

interface ConsumersAndRuleTypesAggregation {
  ruleTypeIds: {
    sum_other_doc_count?: number;
    buckets: Array<{
      key: string;
      consumers: {
        sum_other_doc_count?: number;
        buckets: Array<{ key: string }>;
      };
    }>;
  };
}

// Upper bounds for the authorization aggregation. They are far above the number of
// registered rule types and consumers, and we fail closed if they are ever exceeded.
const MAX_RULE_TYPE_BUCKETS = 1000;
const MAX_CONSUMER_BUCKETS = 100;

// Limits a query to the rule type and consumer pairs the user was authorized for
const getAuthorizedPairsFilter = (
  authorizedPairs: RuleTypeIdConsumersPairs
): QueryDslQueryContainer => ({
  bool: {
    should: authorizedPairs.map(({ ruleTypeId, consumers }) => ({
      bool: {
        filter: [
          { term: { [ALERT_RULE_TYPE_ID]: ruleTypeId } },
          { terms: { [ALERT_RULE_CONSUMER]: consumers } },
        ],
      },
    })),
    minimum_should_match: 1,
  },
});

const getUntrackQuery = (
  params: SetAlertsToUntrackedParamsWithDep,
  alertStatus: AlertStatus,
  authorizedPairs?: RuleTypeIdConsumersPairs
): QueryDslQueryContainer => {
  const { spaceId } = params;

  const statusTerms: Array<{ term: Record<string, { value: string }> }> = [
    {
      term: {
        [ALERT_STATUS]: { value: alertStatus },
      },
    },
  ];

  // Restrict untracking to alerts that belong to the active space only.
  //
  // Note we intentionally do NOT include the all-spaces wildcard ('*') here, unlike the
  // read-side `getSpacesFilter` in rule_registry. Reading globally visible alerts across
  // spaces is legitimate, but mutating them is not: the only rule types that write '*'
  // alerts are internally managed (e.g. Streams "Significant Events"), whose alerts are
  // point-in-time occurrence records that back an internal feature and are never meant to
  // be untracked by users. Matching '*' here would let a caller in one space mutate a
  // document shared by every space. Please keep this divergence from the read path.
  //
  // When spaceId is absent (internal cleanup calls), no space filter is applied.
  const spaceFilter = spaceId ? { terms: { [SPACE_IDS]: [spaceId] } } : undefined;
  const authorizationFilter = authorizedPairs
    ? getAuthorizedPairsFilter(authorizedPairs)
    : undefined;
  const baseFilterClauses: QueryDslQueryContainer[] = [
    ...(spaceFilter ? [spaceFilter] : []),
    ...(authorizationFilter ? [authorizationFilter] : []),
  ];

  if (params.isUsingQuery) {
    const { query } = params;
    const filterClauses = [...baseFilterClauses, ...(query ?? [])];
    return {
      bool: {
        must: statusTerms,
        ...(filterClauses.length > 0 ? { filter: filterClauses } : {}),
      },
    };
  } else {
    const { ruleIds = [], alertUuids = [] } = params;
    const shouldMatchRules: Array<{ term: Record<string, { value: string }> }> = ruleIds.map(
      (ruleId) => ({
        term: {
          [ALERT_RULE_UUID]: { value: ruleId },
        },
      })
    );
    const shouldMatchAlerts: Array<{ term: Record<string, { value: string }> }> = alertUuids.map(
      (alertId) => ({
        term: {
          [ALERT_UUID]: { value: alertId },
        },
      })
    );

    return {
      bool: {
        must: [
          ...statusTerms,
          {
            bool: {
              should: shouldMatchRules,
            },
          },
          {
            bool: {
              should: shouldMatchAlerts,
              // If this is empty, ES will default to minimum_should_match: 0
            },
          },
        ],
        ...(baseFilterClauses.length > 0 ? { filter: baseFilterClauses } : {}),
      },
    };
  }
};

const bulkEnsureAuthorizedToUntrack = async (
  params: SetAlertsToUntrackedParamsWithDep,
  indices: string[],
  bulkEnsureAuthorized: BulkEnsureAuthorizedForUntrack
): Promise<RuleTypeIdConsumersPairs> => {
  const { esClient } = params;

  // Fetch all rule type IDs and rule consumers, then run the provided bulkEnsureAuthorized check once
  const response = await esClient.search<never, ConsumersAndRuleTypesAggregation>({
    index: indices,
    allow_no_indices: true,
    size: 0,
    query: getUntrackQuery(params, ALERT_STATUS_ACTIVE),
    aggs: {
      ruleTypeIds: {
        terms: { field: ALERT_RULE_TYPE_ID, size: MAX_RULE_TYPE_BUCKETS },
        aggs: {
          consumers: { terms: { field: ALERT_RULE_CONSUMER, size: MAX_CONSUMER_BUCKETS } },
        },
      },
    },
    expand_wildcards: ['open', 'hidden'],
  });
  const ruleTypeIdsAggregation = response.aggregations?.ruleTypeIds;
  if (!ruleTypeIdsAggregation) {
    throw new Error('Unable to fetch ruleTypeIds for authorization');
  }

  const { buckets: ruleTypeIdBuckets, sum_other_doc_count: otherRuleTypesCount } =
    ruleTypeIdsAggregation;
  const isAggregationTruncated =
    Boolean(otherRuleTypesCount) ||
    ruleTypeIdBuckets.some(({ consumers }) => Boolean(consumers.sum_other_doc_count));
  if (isAggregationTruncated) {
    throw new Error('Unable to authorize untracking: too many rule types or consumers matched');
  }

  const ruleTypeIdConsumersPairs = ruleTypeIdBuckets.map(
    ({ key: ruleTypeId, consumers: { buckets: consumerBuckets } }) => ({
      ruleTypeId,
      consumers: consumerBuckets.map((b) => b.key),
    })
  );

  for (const pair of ruleTypeIdConsumersPairs) {
    if (pair.consumers.includes('siem')) {
      throw Boom.forbidden('Untracking Security alerts is not permitted');
    }
  }

  await bulkEnsureAuthorized({ ruleTypeIdConsumersPairs });

  return ruleTypeIdConsumersPairs;
};

const getAuthorizedAlertsIndices = async ({
  ruleTypeIds,
  getAllAuthorizedRuleTypesFindOperation,
  getAlertIndicesAlias,
  spaceId,
  logger,
}: SetAlertsToUntrackedParamsWithDep) => {
  try {
    const authorizedRuleTypes = await getAllAuthorizedRuleTypesFindOperation?.({
      authorizationEntity: AlertingAuthorizationEntity.Alert,
      ruleTypeIds,
    });

    if (authorizedRuleTypes) {
      return getAlertIndicesAlias?.(
        Array.from(authorizedRuleTypes.keys()).map((id) => id),
        spaceId
      );
    }

    return [];
  } catch (error) {
    const errMessage = `Failed to get authorized rule types to untrack alerts by query: ${error}`;
    logger.error(errMessage);
    throw new Error(errMessage);
  }
};

export async function setAlertsToUntracked(
  params: SetAlertsToUntrackedParamsWithDep
): Promise<UntrackedAlertsResult> {
  const {
    logger,
    esClient,
    ruleIds = [],
    alertUuids = [], // OPTIONAL - If no alertUuids are passed, untrack ALL ids by default,
    bulkEnsureAuthorized,
    isUsingQuery,
  } = params;

  let indices: string[];

  if (isUsingQuery) {
    indices = (await getAuthorizedAlertsIndices(params)) || [];
  } else {
    if (isEmpty(ruleIds) && isEmpty(alertUuids)) {
      throw new Error('Must provide either ruleIds or alertUuids');
    }
    indices = params.indices || [];
  }

  // When authorization is required, only the alerts of the authorized rule type and consumer
  // pairs are updated, even if new alerts matched the query after the check
  const authorizedPairs = bulkEnsureAuthorized
    ? await bulkEnsureAuthorizedToUntrack(params, indices, bulkEnsureAuthorized)
    : undefined;

  if (authorizedPairs?.length === 0) {
    logger.debug('No active alerts matched the query');
    return [];
  }

  try {
    // Retry this updateByQuery up to 3 times to make sure the number of documents
    // updated equals the number of documents matched
    let total = 0;

    for (let retryCount = 0; retryCount < 3; retryCount++) {
      const response = await esClient.updateByQuery({
        index: indices,
        allow_no_indices: true,
        conflicts: 'proceed',
        script: {
          source: getUntrackUpdatePainlessScript(new Date()),
          lang: 'painless',
        },
        query: getUntrackQuery(params, ALERT_STATUS_ACTIVE, authorizedPairs),
        refresh: true,
      });

      if (total === 0 && response.total === 0) {
        logger.debug('No active alerts matched the query');
        break;
      }

      if (response.total) {
        total = response.total;
      }

      if (response.total === response.updated) {
        break;
      }

      logger.warn(
        `Attempt ${retryCount + 1}: Failed to untrack ${
          (response.total ?? 0) - (response.updated ?? 0)
        } of ${response.total}; indices ${indices}, ${ruleIds ? 'ruleIds' : 'alertUuids'} ${
          ruleIds ? ruleIds : alertUuids
        }`
      );
    }

    if (total === 0) {
      return [];
    }

    // Fetch and return updated rule and alert instance UUIDs
    const searchResponse = await esClient.search({
      index: indices,
      allow_no_indices: true,
      _source: [ALERT_RULE_UUID, ALERT_UUID],
      size: total,
      query: getUntrackQuery(params, ALERT_STATUS_UNTRACKED, authorizedPairs),
    });

    return searchResponse.hits.hits.map((hit) => hit._source) as UntrackedAlertsResult;
  } catch (err) {
    logger.error(
      `Error marking ${ruleIds ? 'ruleIds' : 'alertUuids'} ${
        ruleIds ? ruleIds : alertUuids
      } as untracked - ${err.message}`
    );
    throw err;
  }
}

// Certain rule types don't flatten their AAD values, apply the ALERT_STATUS key to them directly
const getUntrackUpdatePainlessScript = (now: Date) => `
if (!ctx._source.containsKey('${ALERT_STATUS}') || ctx._source['${ALERT_STATUS}'].empty) {
  ctx._source.${ALERT_STATUS} = '${ALERT_STATUS_UNTRACKED}';
  ctx._source.${ALERT_END} = '${now.toISOString()}';
  ctx._source.${ALERT_TIME_RANGE}.lte = '${now.toISOString()}';
  ctx._source.${ALERT_TRACKED} = false;
} else {
  ctx._source['${ALERT_STATUS}'] = '${ALERT_STATUS_UNTRACKED}';
  ctx._source['${ALERT_END}'] = '${now.toISOString()}';
  ctx._source['${ALERT_TIME_RANGE}'].lte = '${now.toISOString()}';
  ctx._source['${ALERT_TRACKED}'] = false;
}`;
