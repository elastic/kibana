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
import {
  LEGACY_RULE_STREAM_TAG_PREFIX,
  NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX,
  type IRulesManagementClient,
} from '../knowledge_indicator_client/rules/rules_management_client';
import type { SignificantEventsKIsOnboardingClient } from '../../workflows/onboarding_workflow_client';
import type { SpaceEnumerationFailure } from '../../spaces/get_all_space_ids';
import { toErrorMessage } from '../../errors/to_error_message';

/**
 * Alerts written by the retired Significant Events v1 integration (alerting
 * framework rules). The index is shared by every space; `-default` is the
 * alerting framework's index suffix, not a Kibana space.
 */
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
  /**
   * `false` when a rule sweep failed and the document wipe was skipped so the
   * reset can be retried; `deleted.documents` and `deleted.alerts_v1` are then 0.
   */
  completed: boolean;
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
  /** Internal user: the hidden knowledge indicators stream is plugin-owned. */
  knowledgeIndicatorsEsClient: ElasticsearchClient;
  /** Current user: the v1 alerts index is not ours, so ES authorization must apply. */
  alertsEsClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  fetchLegacyRuleIds: () => Promise<string[]>;
  getAllSpaceIds: () => Promise<{ spaceIds: SpaceId[]; failure?: SpaceEnumerationFailure }>;
  getRulesManagementClientInSpace: (spaceId: SpaceId) => Promise<IRulesManagementClient>;
  deleteLegacyRules: (ruleIds: string[]) => Promise<void>;
}

/**
 * Cluster-wide, destructive reset of the knowledge indicator system.
 *
 * Removes every knowledge indicator revision (current `source.id` documents and
 * legacy `stream.name` documents alike), every Nightshift-owned Alerting v2 rule
 * in every space the caller can see, Significant Events v1 rules, and the v1
 * alerts index. Nothing is migrated: sources must be re-onboarded afterwards.
 *
 * Rules go before documents, and the document wipe is skipped when any rule
 * sweep failed: the KI links that point at the surviving rules are what makes a
 * re-run able to find and delete them.
 */
export const resetKnowledgeIndicators = async ({
  knowledgeIndicatorsEsClient,
  alertsEsClient,
  logger,
  request,
  streamsKIsOnboardingClient,
  fetchLegacyRuleIds,
  getAllSpaceIds,
  getRulesManagementClientInSpace,
  deleteLegacyRules,
}: ResetKnowledgeIndicatorsDeps): Promise<KnowledgeIndicatorsResetResult> => {
  const failures: KnowledgeIndicatorsResetFailure[] = [];

  const canceledOnboardingCount = await streamsKIsOnboardingClient.cancelAllRunning({ request });

  // v1 rules were keyed by the same rule ids the KI links carry and only ever lived in the
  // default space. A failure here throws before anything is deleted.
  await deleteLegacyRules(await fetchLegacyRuleIds());

  const { spaceIds, failure: spacesFailure } = await getAllSpaceIds();
  if (spacesFailure) {
    failures.push(spacesFailure);
  }

  let deletedRules = 0;
  for (const spaceId of spaceIds) {
    try {
      const rulesClient = await getRulesManagementClientInSpace(spaceId);
      const perPrefix = await Promise.all(
        OWNERSHIP_TAG_PREFIXES.map((prefix) => rulesClient.findRuleIdsByTagPrefix(prefix))
      );
      const ruleIds = [...new Set(perPrefix.flat())];
      if (ruleIds.length > 0) {
        logger.info(
          `Knowledge indicators reset: deleting ${ruleIds.length} Nightshift-owned rules in space "${spaceId}"`
        );
        await rulesClient.bulkDeleteRules(ruleIds);
        deletedRules += ruleIds.length;
      }
    } catch (error) {
      failures.push({ target: `rules:${spaceId}`, error: toErrorMessage(error) });
    }
  }

  const base = {
    canceled_onboarding_count: canceledOnboardingCount,
    spaces: spaceIds,
    failures,
  };

  if (failures.length > 0) {
    logger.warn(
      `Knowledge indicators reset: skipping the document wipe because ${failures.length} rule sweep(s) failed; re-run once resolved`
    );
    return {
      ...base,
      completed: false,
      deleted: { documents: 0, rules: deletedRules, alerts_v1: 0 },
    };
  }

  // Intentionally not space-scoped: this is the only path that removes legacy `stream.name`
  // documents, which no space-scoped reader can see any more. `refresh: true` so a re-onboard
  // that starts right after the reset returns cannot read the wiped revisions.
  const documentsDeleteResponse = await knowledgeIndicatorsEsClient.deleteByQuery(
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
  const alertsDeleteResponse = await alertsEsClient.deleteByQuery(
    {
      index: V1_ALERTS_INDEX,
      conflicts: 'proceed',
      query: { match_all: {} },
    },
    { ignore: [404] }
  );

  return {
    ...base,
    completed: true,
    deleted: {
      documents: documentsDeleteResponse.deleted ?? 0,
      rules: deletedRules,
      alerts_v1: alertsDeleteResponse.deleted ?? 0,
    },
  };
};
