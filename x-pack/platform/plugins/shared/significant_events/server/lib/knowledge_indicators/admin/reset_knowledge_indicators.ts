/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpaceId } from '@kbn/core-spaces-common';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../data_stream';
import { fetchAllRuleIdsClusterWide } from '../knowledge_indicator_client/revision_reader';
import {
  LEGACY_RULE_STREAM_TAG_PREFIX,
  NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX,
  type IRulesManagementClient,
} from '../knowledge_indicator_client/rules/rules_management_client';
import type { SignificantEventsKIsOnboardingClient } from '../../workflows/onboarding_workflow_client';

const V1_ALERTS_INDEX = '.alerts-streams.alerts-default';

const OWNERSHIP_TAG_PREFIXES = [
  NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX,
  LEGACY_RULE_STREAM_TAG_PREFIX,
] as const;

export interface KnowledgeIndicatorsResetFailure {
  /** `spaces`, or `rules:<spaceId>`. */
  target: string;
  error: string;
}

/** Response from POST /internal/significant_events/knowledge_indicators/_reset. */
export interface KnowledgeIndicatorsResetResult {
  canceled_onboarding_count: number;
  /** Spaces whose Nightshift-owned rules were swept. */
  spaces: string[];
  deleted: {
    /** Knowledge indicator revisions removed from the data stream, legacy documents included. */
    documents: number;
    /** Alerting v2 rules deleted across every swept space. */
    rules: number;
    alerts_v1: number;
  };
  failures: KnowledgeIndicatorsResetFailure[];
}

export interface ResetKnowledgeIndicatorsDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  getAllSpaceIds: () => Promise<{
    spaceIds: SpaceId[];
    failure?: KnowledgeIndicatorsResetFailure;
  }>;
  getRulesManagementClientInSpace: (spaceId: SpaceId) => Promise<IRulesManagementClient>;
  deleteLegacyRules: (ruleIds: string[]) => Promise<void>;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Cluster-wide, destructive reset of the knowledge indicator system.
 *
 * Removes every knowledge indicator revision (current `source.id` documents and
 * legacy `stream.name` documents alike), every Nightshift-owned Alerting v2 rule
 * in every space the caller can see, Significant Events v1 rules, and the v1
 * alerts index. Nothing is migrated: sources must be re-onboarded afterwards.
 *
 * Rules go before documents so a mid-flight failure leaves the KI links that
 * point at them and the reset stays retryable.
 */
export const resetKnowledgeIndicators = async ({
  esClient,
  logger,
  request,
  streamsKIsOnboardingClient,
  getAllSpaceIds,
  getRulesManagementClientInSpace,
  deleteLegacyRules,
}: ResetKnowledgeIndicatorsDeps): Promise<KnowledgeIndicatorsResetResult> => {
  const failures: KnowledgeIndicatorsResetFailure[] = [];

  const canceledOnboardingCount = await streamsKIsOnboardingClient.cancelAllRunning({ request });

  // v1 rules were keyed by the same rule ids the KI links carry and only ever lived in the
  // default space. Delete them before the documents so a failure keeps the ids reachable.
  const legacyRuleIds = await fetchAllRuleIdsClusterWide(esClient, logger);
  await deleteLegacyRules(legacyRuleIds);

  const { spaceIds, failure: spacesFailure } = await getAllSpaceIds();
  if (spacesFailure) {
    failures.push(spacesFailure);
  }

  let deletedRules = 0;
  for (const spaceId of spaceIds) {
    try {
      const rulesClient = await getRulesManagementClientInSpace(spaceId);
      const ruleIds = new Set<string>();
      for (const prefix of OWNERSHIP_TAG_PREFIXES) {
        for (const id of await rulesClient.findRuleIdsByTagPrefix(prefix)) {
          ruleIds.add(id);
        }
      }
      if (ruleIds.size > 0) {
        logger.info(
          `Knowledge indicators reset: deleting ${ruleIds.size} Nightshift-owned rules in space "${spaceId}"`
        );
        await rulesClient.bulkDeleteRules([...ruleIds]);
        deletedRules += ruleIds.size;
      }
    } catch (error) {
      failures.push({ target: `rules:${spaceId}`, error: toMessage(error) });
    }
  }

  // Intentionally not space-scoped: this is the only path that removes legacy `stream.name`
  // documents, which no space-scoped reader can see any more.
  const documentsDeleteResponse = await esClient.deleteByQuery(
    {
      index: KNOWLEDGE_INDICATORS_DATA_STREAM,
      conflicts: 'proceed',
      refresh: true,
      query: { match_all: {} },
    },
    { ignore: [404] }
  );

  // Intentionally cluster-wide as well: `.alerts-streams.alerts-default` is a shared,
  // space-partitioned index, but the reset is a one-time v1 orphan cleanup.
  const alertsDeleteResponse = await esClient.deleteByQuery(
    {
      index: V1_ALERTS_INDEX,
      conflicts: 'proceed',
      query: { match_all: {} },
    },
    { ignore: [404] }
  );

  return {
    canceled_onboarding_count: canceledOnboardingCount,
    spaces: spaceIds,
    deleted: {
      documents: documentsDeleteResponse.deleted ?? 0,
      rules: deletedRules,
      alerts_v1: alertsDeleteResponse.deleted ?? 0,
    },
    failures,
  };
};
