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

/** Deleted counts returned by the Significant Events alerting v2 upgrade reset API. */
export interface SignificantEventsResetDeletedCounts {
  queries: number;
  features: number;
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
}

/**
 * Clears experimental alerting v1 state so a cluster can onboard again on alerting v2.
 * Removes all KIs, backing rules, and documents in `.alerts-streams.alerts-default`.
 *
 * Cluster-wide by design: KI/rule enumeration and the v1 alerts delete are NOT space-scoped,
 * so this affects every space, not just the caller's. It is a one-time cluster migration tool.
 */
export const resetSignificantEvents = async ({
  kiClient,
  esClient,
  logger,
  request,
  streamsKIsOnboardingClient,
}: ResetSignificantEventsDeps): Promise<SignificantEventsResetResult> => {
  const canceledOnboardingCount = await streamsKIsOnboardingClient.cancelAllRunning({ request });
  const { streamNames, ruleIds, byStream } = await collectResetSnapshot(kiClient);

  const deleted = emptySignificantEventsResetDeletedCounts();
  for (const streamCounts of Object.values(byStream)) {
    sumDeletedCounts(deleted, streamCounts);
  }
  deleted.rules = ruleIds.length;

  for (const streamName of streamNames) {
    logger.info(`Significant events reset: clearing KIs and rules for stream "${streamName}"`);
    await resetStreamKnowledgeIndicators({ streamName, kiClient, ruleIds, logger });
  }

  // Intentionally cluster-wide: this reset wipes v1 alerts across ALL spaces, not just the
  // caller's. `.alerts-streams.alerts-default` is a shared, space-partitioned index, but the
  // reset is a cluster-level alerting-v1 -> v2 migration tool, so `match_all` (no
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
