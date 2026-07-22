/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { LiveStageTokenUsage } from './live_token_usage';
import { emptyStageTokenUsage } from './live_token_usage';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from './snapshot_indices';

const ONBOARDING_POLL_INTERVAL_MS = 10_000;
const DEFAULT_ONBOARDING_TIMEOUT_MS = 20 * 60 * 1000;
const KI_QUERY_SEARCH_LIMIT = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GeneratedRuleBackedQuery {
  query_id: string;
  rule_id: string;
  title: string;
  esql: string;
  severity_score?: number;
}

export interface LiveOnboardingResult {
  generatedQueries: GeneratedRuleBackedQuery[];
  /** LLM usage reported by the onboarding workflow (features + queries steps combined). */
  tokensUsed: LiveStageTokenUsage;
}

/** `tokensUsed` payload shape from the onboarding status route (`ChatCompletionTokenCount`). */
interface OnboardingStepTokens {
  prompt?: number;
  completion?: number;
  cached?: number;
}

interface OnboardingCompletedStatus {
  status?: string;
  error?: unknown;
  features?: { tokensUsed?: OnboardingStepTokens };
  queries?: { tokensUsed?: OnboardingStepTokens };
}

const sumOnboardingTokens = (status: OnboardingCompletedStatus): LiveStageTokenUsage => {
  const usage = emptyStageTokenUsage();
  for (const step of [status.features, status.queries]) {
    usage.inputTokens += step?.tokensUsed?.prompt ?? 0;
    usage.outputTokens += step?.tokensUsed?.completion ?? 0;
    usage.cachedTokens += step?.tokensUsed?.cached ?? 0;
  }
  // The onboarding status payload does not report call counts.
  return usage;
};

/**
 * Run the REAL KI onboarding pipeline on a stream: schedule the managed onboarding workflow
 * (LLM feature extraction + query generation over the given sampling window), poll it to
 * completion, then promote remaining unbacked queries so every eligible generated query is
 * backed by a live alerting rule.
 *
 * Returns the generated rule-backed queries (with the rule ids the alerting rules carry) read
 * back from the live knowledge-indicators stream.
 */
export async function runLiveOnboarding({
  kbnClient,
  esClient,
  log,
  streamName,
  samplingWindow,
  timeoutMs = DEFAULT_ONBOARDING_TIMEOUT_MS,
}: {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
  streamName: string;
  samplingWindow: { from: string; to: string };
  timeoutMs?: number;
}): Promise<LiveOnboardingResult> {
  log.info(
    `Scheduling live KI onboarding (features + queries) on "${streamName}" over ${samplingWindow.from} .. ${samplingWindow.to}`
  );
  await kbnClient.request({
    path: `/internal/streams/${streamName}/onboarding/_execute`,
    method: 'POST',
    body: {
      action: 'schedule',
      from: samplingWindow.from,
      to: samplingWindow.to,
      steps: ['features_identification', 'queries_generation'],
    },
  });

  const start = Date.now();
  const deadline = start + timeoutMs;
  let completedStatus: OnboardingCompletedStatus | undefined;
  while (Date.now() < deadline) {
    await sleep(ONBOARDING_POLL_INTERVAL_MS);
    const statusResponse = await kbnClient.request<OnboardingCompletedStatus>({
      path: `/internal/streams/${streamName}/onboarding/_status`,
      method: 'GET',
    });
    const status = statusResponse.data.status;
    if (status === 'completed') {
      completedStatus = statusResponse.data;
      break;
    }
    if (status === 'failed' || status === 'canceled') {
      throw new Error(
        `Live onboarding ended with status "${status}": ${JSON.stringify(
          statusResponse.data.error ?? 'no error detail'
        )}`
      );
    }
    log.info(
      `  onboarding status: ${status} (${Math.round((Date.now() - start) / 1000)}s elapsed)`
    );
  }
  if (!completedStatus) {
    throw new Error(`Live onboarding did not complete within ${timeoutMs / 1000}s`);
  }
  const tokensUsed = sumOnboardingTokens(completedStatus);
  log.info(
    `Live onboarding completed in ${Math.round((Date.now() - start) / 1000)}s ` +
      `(${tokensUsed.inputTokens} input / ${tokensUsed.outputTokens} output tokens)`
  );

  // Queries generation already rule-backs high-severity queries via _persist; promote the rest.
  const promoteResponse = await kbnClient.request<{ promoted?: number; skipped_stats?: number }>({
    path: '/internal/streams/queries/_promote',
    method: 'POST',
    body: {},
  });
  log.info(
    `Promoted ${promoteResponse.data.promoted ?? 0} additional quer(ies) to rule-backed ` +
      `(${promoteResponse.data.skipped_stats ?? 0} STATS quer(ies) skipped)`
  );

  const queries = await readGeneratedRuleBackedQueries(esClient, streamName);
  if (queries.length === 0) {
    throw new Error(
      'Live onboarding produced zero rule-backed queries — nothing downstream can fire'
    );
  }
  log.info(
    `Live onboarding produced ${queries.length} rule-backed quer(ies): ${queries
      .map((query) => query.title)
      .join('; ')}`
  );
  return { generatedQueries: queries, tokensUsed };
}

/**
 * Read the latest revision of every rule-backed KI query for a stream directly from the live
 * knowledge-indicators data stream (mirrors `getRuleBackedQueryLinks` semantics: latest revision
 * per id, not deleted, `query.rule_backed == true`).
 */
interface StoredKIQuerySource {
  id?: string;
  title?: string;
  deleted?: boolean;
  query?: {
    esql?: string;
    rule_backed?: boolean;
    rule_id?: string;
    severity_score?: number;
  };
}

export async function readGeneratedRuleBackedQueries(
  esClient: Client,
  streamName: string
): Promise<GeneratedRuleBackedQuery[]> {
  await esClient.indices.refresh({ index: KNOWLEDGE_INDICATORS_DATA_STREAM }).catch(() => {});

  const response = await esClient.search<StoredKIQuerySource>({
    index: KNOWLEDGE_INDICATORS_DATA_STREAM,
    ignore_unavailable: true,
    size: KI_QUERY_SEARCH_LIMIT,
    sort: [{ '@timestamp': 'asc' }],
    query: {
      bool: {
        filter: [{ term: { type: 'query' } }, { term: { 'stream.name': streamName } }],
      },
    },
  });

  // Ascending sort: the last doc per id is the latest revision.
  const latestById = new Map<string, StoredKIQuerySource>();
  for (const hit of response.hits.hits) {
    const source = hit._source;
    if (source?.id) {
      latestById.set(source.id, source);
    }
  }

  return [...latestById.values()].flatMap((source) => {
    const { id, title, deleted, query } = source;
    if (!id || deleted === true || query?.rule_backed !== true || !query.rule_id) {
      return [];
    }
    return [
      {
        query_id: id,
        rule_id: query.rule_id,
        title: title ?? id,
        esql: query.esql ?? '',
        severity_score: query.severity_score,
      },
    ];
  });
}
