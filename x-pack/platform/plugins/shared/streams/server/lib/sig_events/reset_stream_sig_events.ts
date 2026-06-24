/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  StreamsSigEventsResetDeletedCounts,
  StreamsSigEventsResetResult,
} from '@kbn/streams-schema';
import type { KnowledgeIndicatorClient } from '../streams/ki';
import { deleteByQueryBestEffort } from './delete_by_query_best_effort';
import type { StreamsKIsOnboardingClient } from '../workflows/onboarding_workflow_client';

const V1_ALERTS_INDEX = '.alerts-streams.alerts-default';

export const emptySigEventsResetDeletedCounts = (): StreamsSigEventsResetDeletedCounts => ({
  queries: 0,
  features: 0,
  rules: 0,
  alertsV1: 0,
});

const sumDeletedCounts = (
  totals: StreamsSigEventsResetDeletedCounts,
  streamCounts: StreamsSigEventsResetDeletedCounts
): void => {
  totals.queries += streamCounts.queries;
  totals.features += streamCounts.features;
  totals.rules += streamCounts.rules;
};

interface ResetSnapshot {
  streamNames: string[];
  ruleIds: string[];
  byStream: Record<string, StreamsSigEventsResetDeletedCounts>;
}

const collectResetSnapshot = async (
  kiClient: KnowledgeIndicatorClient
): Promise<ResetSnapshot> => {
  const streamNames = await kiClient.getStreamNamesWithKnowledgeIndicators();
  const byStream: Record<string, StreamsSigEventsResetDeletedCounts> = {};
  const ruleIds = new Set<string>();

  for (const streamName of streamNames) {
    const streamCounts = emptySigEventsResetDeletedCounts();
    const { [streamName]: queryLinks = [] } = await kiClient.getStreamToQueryLinksMap([streamName]);
    streamCounts.queries = queryLinks.length;
    for (const link of queryLinks) {
      if (link.rule_backed && link.rule_id) {
        ruleIds.add(link.rule_id);
      }
    }
    streamCounts.rules = queryLinks.filter((link) => link.rule_backed && link.rule_id).length;

    const { hits: features } = await kiClient.getFeatures(streamName);
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
      `SigEvents reset failed for stream ${streamName} during KI cleanup: ${errorMessage}.${orphanContext}`
    );
    throw error;
  }
};

export interface ResetSignificantEventsDeps {
  kiClient: KnowledgeIndicatorClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  streamsKIsOnboardingClient: StreamsKIsOnboardingClient;
}

/**
 * Clears experimental alerting v1 state so a cluster can onboard again on alerting v2.
 * Removes all KIs, backing rules, and documents in `.alerts-streams.alerts-default`.
 */
export const resetSignificantEvents = async ({
  kiClient,
  esClient,
  logger,
  request,
  streamsKIsOnboardingClient,
}: ResetSignificantEventsDeps): Promise<StreamsSigEventsResetResult> => {
  const canceledOnboardingCount = await streamsKIsOnboardingClient.cancelAllRunning({ request });
  const { streamNames, ruleIds, byStream } = await collectResetSnapshot(kiClient);

  const deleted = emptySigEventsResetDeletedCounts();
  for (const streamCounts of Object.values(byStream)) {
    sumDeletedCounts(deleted, streamCounts);
  }
  deleted.rules = ruleIds.length;

  for (const streamName of streamNames) {
    logger.info(`SigEvents reset: clearing KIs and rules for stream "${streamName}"`);
    await resetStreamKnowledgeIndicators({ streamName, kiClient, ruleIds, logger });
  }

  deleted.alertsV1 = await deleteByQueryBestEffort({
    esClient,
    index: V1_ALERTS_INDEX,
    query: { match_all: {} },
  });

  return {
    streams: streamNames,
    canceledOnboardingCount,
    deleted,
    byStream,
  };
};
