/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import type { SignificantEventsKIsOnboardingClient } from '../workflows/onboarding_workflow_client';

const V1_ALERTS_INDEX = '.alerts-streams.alerts-default';

/** Deleted counts returned by the one-time Significant Events orphan-cleanup API. */
export interface SignificantEventsResetDeletedCounts {
  queries: number;
  features: number;
  /** Backing rule IDs targeted across the v1 and v2 stores. */
  rules: number;
  alerts_v1: number;
}

/** Response from POST /internal/streams/significant_events/_reset_kis. */
export interface SignificantEventsResetResult {
  /** Stream names that had knowledge indicators before the reset. */
  streams: string[];
  canceled_onboarding_count: number;
  deleted: SignificantEventsResetDeletedCounts;
  /** Per-stream KI and rule snapshot counts before deletion. */
  by_stream: Record<string, SignificantEventsResetDeletedCounts>;
}

export const emptySignificantEventsResetDeletedCounts =
  (): SignificantEventsResetDeletedCounts => ({
    queries: 0,
    features: 0,
    rules: 0,
    alerts_v1: 0,
  });

const sumDeletedCounts = (
  totals: SignificantEventsResetDeletedCounts,
  streamCounts: SignificantEventsResetDeletedCounts
): void => {
  totals.queries += streamCounts.queries;
  totals.features += streamCounts.features;
  totals.rules += streamCounts.rules;
};

interface ResetSnapshot {
  streamNames: string[];
  ruleIds: string[];
  byStream: Record<string, SignificantEventsResetDeletedCounts>;
}

const collectResetSnapshot = async (kiClient: KnowledgeIndicatorClient): Promise<ResetSnapshot> => {
  const streamNames = await kiClient.getStreamNamesWithKnowledgeIndicators();
  const byStream: Record<string, SignificantEventsResetDeletedCounts> = {};
  const ruleIds = new Set<string>();

  for (const streamName of streamNames) {
    const streamCounts = emptySignificantEventsResetDeletedCounts();
    const { [streamName]: queryLinks = [] } = await kiClient.getStreamToQueryLinksMap(
      [streamName],
      { includeExpired: true }
    );
    streamCounts.queries = queryLinks.length;
    for (const link of queryLinks) {
      if (link.rule_backed && link.rule_id) {
        ruleIds.add(link.rule_id);
      }
    }
    streamCounts.rules = queryLinks.filter((link) => link.rule_backed && link.rule_id).length;

    // Match `deleteIndicators`, which tombstones every non-deleted feature: count excluded and
    // expired features too, otherwise this snapshot undercounts what the reset actually deletes.
    const { hits: features } = await kiClient.getFeatures(streamName, {
      includeExcluded: true,
      includeExpired: true,
    });
    streamCounts.features = features.length;

    byStream[streamName] = streamCounts;
  }

  return {
    streamNames,
    ruleIds: [...ruleIds],
    byStream,
  };
};

const resetStreamKnowledgeIndicators = async ({
  streamName,
  kiClient,
  ruleIds,
  logger,
}: {
  streamName: string;
  kiClient: KnowledgeIndicatorClient;
  ruleIds: string[];
  logger: Logger;
}): Promise<void> => {
  try {
    await kiClient.deleteAllQueries(streamName);
    await kiClient.deleteIndicators(streamName);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const orphanContext =
      ruleIds.length > 0 ? ` candidateOrphanedRuleIds=[${ruleIds.join(',')}]` : '';
    logger.error(
      `Significant events reset failed for stream ${streamName} during KI cleanup: ${errorMessage}.${orphanContext}`
    );
    throw error;
  }
};

export interface ResetSignificantEventsDeps {
  kiClient: KnowledgeIndicatorClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  streamsKIsOnboardingClient: SignificantEventsKIsOnboardingClient;
  deleteLegacyRules: (ruleIds: string[]) => Promise<void>;
}

/**
 * One-time cleanup for clusters that may still contain experimental alerting v1 state.
 * Removes all KIs, linked v1/v2 backing rules, and orphaned documents in
 * `.alerts-streams.alerts-default` before re-onboarding on Alerting v2.
 *
 * Cluster-wide by design: KI/rule enumeration and the v1 alerts delete are NOT space-scoped,
 * so this affects every space, not just the caller's.
 *
 * TODO: Remove after the time-boxed follow-up to nightshift-program#651 confirms that no
 * supported upgrade path can contain Significant Events v1 rules or alerts.
 */
export const resetSignificantEvents = async ({
  kiClient,
  esClient,
  logger,
  request,
  streamsKIsOnboardingClient,
  deleteLegacyRules,
}: ResetSignificantEventsDeps): Promise<SignificantEventsResetResult> => {
  const canceledOnboardingCount = await streamsKIsOnboardingClient.cancelAllRunning({ request });
  const { streamNames, ruleIds, byStream } = await collectResetSnapshot(kiClient);

  const deleted = emptySignificantEventsResetDeletedCounts();
  for (const streamCounts of Object.values(byStream)) {
    sumDeletedCounts(deleted, streamCounts);
  }
  deleted.rules = ruleIds.length;

  // Delete v1 rules before removing their KI links so a failure remains retryable. Missing rules
  // are expected for v2-backed links and are ignored by the cleanup-only v1 client.
  await deleteLegacyRules(ruleIds);

  for (const streamName of streamNames) {
    logger.info(`Significant events reset: clearing KIs and rules for stream "${streamName}"`);
    await resetStreamKnowledgeIndicators({ streamName, kiClient, ruleIds, logger });
  }

  // Intentionally cluster-wide: this reset wipes v1 alerts across ALL spaces, not just the
  // caller's. `.alerts-streams.alerts-default` is a shared, space-partitioned index, but the
  // reset is a one-time cluster-level v1 orphan cleanup, so `match_all` (no
  // `kibana.space_ids` filter) is deliberate and mirrors the cluster-wide KI/rule cleanup above.
  const alertsDeleteResponse = await esClient.deleteByQuery(
    {
      index: V1_ALERTS_INDEX,
      conflicts: 'proceed',
      query: { match_all: {} },
    },
    { ignore: [404] }
  );
  deleted.alerts_v1 = alertsDeleteResponse.deleted ?? 0;

  return {
    streams: streamNames,
    canceled_onboarding_count: canceledOnboardingCount,
    deleted,
    by_stream: byStream,
  };
};
