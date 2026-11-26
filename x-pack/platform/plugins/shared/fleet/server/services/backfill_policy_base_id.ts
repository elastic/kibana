/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import {
  AGENT_POLICY_INDEX,
  AGENTS_INDEX,
  AGENT_POLICY_VERSION_SEPARATOR,
} from '../../common/constants';

// Painless: strip version suffix from policy_id and store as policy_base_id.
// Mirrors removeVersionSuffixFromPolicyId: only strips when the segment after the last
// separator looks like a version (digits.digits). Painless regex is off by default so
// we use a plain digit walk instead. Skips docs that already have policy_base_id (idempotent).
export const BACKFILL_SCRIPT = `
  if (ctx._source.policy_id == null ||
      (ctx._source.containsKey('policy_base_id') && ctx._source.policy_base_id != null)) {
    ctx.op = 'noop';
    return;
  }
  String pid = ctx._source.policy_id;
  int sepIdx = pid.lastIndexOf(params.separator);
  if (sepIdx >= 0) {
    String suffix = pid.substring(sepIdx + 1);
    int dotIdx = suffix.indexOf('.');
    boolean isVersion = dotIdx > 0 && suffix.length() > dotIdx + 1;
    if (isVersion) {
      for (int i = 0; i < suffix.length(); i++) {
        if (i != dotIdx && !Character.isDigit(suffix.charAt(i))) { isVersion = false; break; }
      }
    }
    ctx._source.policy_base_id = isVersion ? pid.substring(0, sepIdx) : pid;
  } else {
    ctx._source.policy_base_id = pid;
  }
`.trim();

// Documents of an index are updated in batches of `maxDocs`, fetched `scrollSize` at a time, so that
// one batch never holds more than `scrollSize` documents in memory: `.fleet-policies` documents can be
// several MB each, and the default scroll size of 1000 then fetches GBs of `_source` at once.
// Each batch is a short request, well below the request timeout, so that a batch does not keep running
// in Elasticsearch after Kibana stopped waiting for it.
export interface BackfillTarget {
  index: string;
  label: string;
  scrollSize: number;
  maxDocs: number;
}

export const BACKFILL_TARGETS: BackfillTarget[] = [
  { index: AGENTS_INDEX, label: 'fleet-agents', scrollSize: 500, maxDocs: 5000 },
  { index: AGENT_POLICY_INDEX, label: 'fleet-policies', scrollSize: 10, maxDocs: 50 },
];

// Time spent on an index per run. Updated documents are not selected again, so the next run continues
// where this one stopped. Both indices fit in the timeout of the Fleet setup task.
export const BACKFILL_TIME_BUDGET_MS = 4 * 60 * 1000;

// Requests rejected by a circuit breaker (429) or answered by an overloaded node are retried within the
// time budget, with a growing delay, rather than on the next Fleet setup: setup requests are rejected
// by the same breaker and may never get to schedule the task again. Updated documents are not selected
// again, so retrying a batch is safe.
export const BACKFILL_RETRY_BASE_DELAY_MS = 2000;
const BACKFILL_RETRY_MAX_DELAY_MS = 30 * 1000;
const RETRYABLE_STATUS_CODES = [429, 502, 503, 504];

const isRetryable = (err: unknown) =>
  RETRYABLE_STATUS_CODES.includes((err as { statusCode?: number } | undefined)?.statusCode ?? 0);

// Resolves early when the signal is aborted
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      return resolve();
    }
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done);
  });

const BACKFILL_QUERY = {
  bool: {
    must: [{ exists: { field: 'policy_id' } }],
    must_not: [{ exists: { field: 'policy_base_id' } }],
  },
};

export type BackfillStatus = 'completed' | 'partial' | 'failed';

export interface BackfillResult {
  label: string;
  status: BackfillStatus;
  updated: number;
}

interface BackfillOptions {
  logger: Logger;
  signal?: AbortSignal;
  timeBudgetMs?: number;
  retryBaseDelayMs?: number;
}

const countDocumentsToBackfill = async (
  esClient: ElasticsearchClient,
  index: string,
  signal?: AbortSignal
) => {
  const { count } = await esClient.count(
    {
      index,
      ignore_unavailable: true,
      query: BACKFILL_QUERY,
    },
    { signal }
  );
  return count;
};

export async function backfillIndex(
  esClient: ElasticsearchClient,
  { index, label, scrollSize, maxDocs }: BackfillTarget,
  {
    logger,
    signal,
    timeBudgetMs = BACKFILL_TIME_BUDGET_MS,
    retryBaseDelayMs = BACKFILL_RETRY_BASE_DELAY_MS,
  }: BackfillOptions
): Promise<BackfillResult> {
  let updated = 0;
  const deadline = Date.now() + timeBudgetMs;
  let retries = 0;
  // Retries a request that was rejected as transient while there is time left in the budget
  const withRetries = async <T>(request: () => Promise<T>): Promise<T> => {
    for (;;) {
      try {
        const response = await request();
        retries = 0;
        return response;
      } catch (err) {
        const delay = Math.min(retryBaseDelayMs * 2 ** retries, BACKFILL_RETRY_MAX_DELAY_MS);
        if (signal?.aborted || !isRetryable(err) || Date.now() + delay >= deadline) {
          throw err;
        }
        retries++;
        logger.warn(
          `Retrying the policy_base_id backfill of ${label} in ${delay}ms after updating ${updated} documents: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        await sleep(delay, signal);
        if (signal?.aborted) {
          throw err;
        }
      }
    }
  };
  const partial = (detail: string): BackfillResult => {
    logger.info(
      `Backfilled policy_base_id on ${updated} ${label} documents: partial, ${detail}, continuing on the next run`
    );
    return { label, status: 'partial', updated };
  };
  try {
    // Cheap check, so that a setup after a completed backfill does not update anything
    if ((await withRetries(() => countDocumentsToBackfill(esClient, index, signal))) === 0) {
      logger.debug(`No ${label} documents without policy_base_id to backfill`);
      return { label, status: 'completed', updated };
    }

    while (!signal?.aborted && Date.now() < deadline) {
      const result = await withRetries(() =>
        esClient.updateByQuery(
          {
            index,
            ignore_unavailable: true,
            conflicts: 'proceed',
            max_docs: maxDocs,
            scroll_size: scrollSize,
            // The next batch must not select the documents of this one again
            refresh: true,
            script: {
              lang: 'painless',
              source: BACKFILL_SCRIPT,
              params: { separator: AGENT_POLICY_VERSION_SEPARATOR },
            },
            query: BACKFILL_QUERY,
          },
          { signal }
        )
      );
      const batchUpdated = result.updated ?? 0;
      updated += batchUpdated;
      // A batch that is not full went through every document, but skipped those with a version
      // conflict: the next batch selects them again
      if (
        (result.total ?? 0) < maxDocs &&
        (await withRetries(() => countDocumentsToBackfill(esClient, index, signal))) === 0
      ) {
        logger.info(`Backfilled policy_base_id on ${updated} ${label} documents: completed`);
        return { label, status: 'completed', updated };
      }
      // Stop rather than select the same documents again
      if (batchUpdated === 0) {
        break;
      }
    }

    if (signal?.aborted) {
      return partial('task cancelled');
    }
    // The count only tells what is left, it is not retried: the budget is spent, and a rejection of it
    // must not turn the documents updated above into a failure
    const remaining = await countDocumentsToBackfill(esClient, index, signal).catch(
      () => undefined
    );
    return partial(remaining === undefined ? 'remaining unknown' : `${remaining} remaining`);
  } catch (err) {
    if (signal?.aborted) {
      return partial('task cancelled');
    }
    logger.warn(
      `Failed to backfill policy_base_id on ${label} after updating ${updated} documents: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { label, status: 'failed', updated };
  }
}

/**
 * Sets `policy_base_id` on the documents of `.fleet-agents` and `.fleet-policies` written before it was
 * added. Never throws: the outcome of every index is logged and returned.
 */
export async function backfillPolicyBaseId(
  esClient: ElasticsearchClient,
  options: BackfillOptions
): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];
  // One index after the other, so that the two do not load the nodes at the same time
  for (const target of BACKFILL_TARGETS) {
    if (options.signal?.aborted) {
      break;
    }
    results.push(await backfillIndex(esClient, target, options));
  }
  return results;
}
