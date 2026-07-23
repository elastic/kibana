/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';

const LOGS_STREAM_NAME = 'logs';
/** Page size for the PIT + search_after fetch — must stay under `index.max_result_window`. */
const TAIL_FETCH_PAGE_SIZE = 5_000;
const TICK_INTERVAL_MS = 5_000;
const PROGRESS_LOG_EVERY_MS = 30_000;
/**
 * How long to keep waiting after the last tail doc is written, so the 1m-cadence rules run a
 * couple more times over the tail end (their lookback is 2x the interval).
 */
const DEFAULT_POST_STREAM_WAIT_MS = 150_000;

export interface TailStreamStats {
  total: number;
  created: number;
  skipped: number;
  /** Wall-clock duration of the streaming phase (excluding the post-stream wait). */
  streamedMs: number;
}

interface TailDoc {
  mappedTimestampMs: number;
  source: Record<string, unknown>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch all tail docs ordered by `@timestamp` via point-in-time + search_after — a single
 * search page is capped by `index.max_result_window` (10k), which a busy tail can exceed.
 */
async function fetchTailSources(
  esClient: Client,
  {
    tempIndices,
    cutTimestampMs,
    tailEndMs,
  }: { tempIndices: string[]; cutTimestampMs: number; tailEndMs: number }
): Promise<Array<Record<string, unknown>>> {
  const pit = await esClient.openPointInTime({
    index: tempIndices.join(','),
    keep_alive: '5m',
  });

  const sources: Array<Record<string, unknown>> = [];
  try {
    let searchAfter: SortResults | undefined;
    while (true) {
      const response = await esClient.search<Record<string, unknown>>({
        size: TAIL_FETCH_PAGE_SIZE,
        pit: { id: pit.id, keep_alive: '5m' },
        // _shard_doc is the PIT-native tiebreaker for deterministic search_after paging.
        sort: [{ '@timestamp': 'asc' }, { _shard_doc: 'asc' }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        query: {
          range: {
            '@timestamp': {
              gte: new Date(cutTimestampMs).toISOString(),
              // Inclusive: with max_tail_minutes == incident_onset_offset_minutes (the shipped
              // configs) the tail end coincides with the snapshot's max timestamp, and the
              // final docs — the incident's peak — must stream too.
              lte: new Date(tailEndMs).toISOString(),
            },
          },
        },
      });

      const hits = response.hits.hits;
      if (hits.length === 0) {
        break;
      }
      for (const hit of hits) {
        if (hit._source) {
          sources.push(hit._source);
        }
      }
      searchAfter = hits[hits.length - 1].sort;
      if (hits.length < TAIL_FETCH_PAGE_SIZE) {
        break;
      }
    }
  } finally {
    await esClient.closePointInTime({ id: pit.id }).catch(() => {});
  }

  return sources;
}

/**
 * Stream the incident tail of a replayed snapshot into the managed `logs` stream at 1x wall
 * clock, so real alerting rules observe the incident as it "happens": each tail document is
 * written when `streamStart + (sourceTs - cut)` arrives, with `@timestamp` stamped to that
 * mapped moment (inside the rules' `(now-lookback..now]` windows).
 *
 * Owns cleanup of the temp indices left behind by `replayBaselineSliceIntoManagedStream`.
 */
export async function streamIncidentTail(
  esClient: Client,
  log: ToolingLog,
  {
    tempIndices,
    cutTimestampMs,
    maxTailMinutes,
    postStreamWaitMs = DEFAULT_POST_STREAM_WAIT_MS,
  }: {
    tempIndices: string[];
    cutTimestampMs: number;
    maxTailMinutes: number;
    postStreamWaitMs?: number;
  }
): Promise<TailStreamStats> {
  const tailEndMs = cutTimestampMs + maxTailMinutes * 60_000;

  try {
    const sources = await fetchTailSources(esClient, { tempIndices, cutTimestampMs, tailEndMs });

    // Docs beyond the tail cap never get streamed. For an incident scenario the failure usually
    // sits at the END of the snapshot, so a cap smaller than the onset offset drops exactly the
    // data the pipeline is supposed to detect — make that loud. Strictly-greater-than: the doc
    // at exactly the tail end IS streamed (see the `lte` fetch above), so it must not warn.
    const beyondCapResponse = await esClient.count({
      index: tempIndices.join(','),
      query: { range: { '@timestamp': { gt: new Date(tailEndMs).toISOString() } } },
    });
    if (beyondCapResponse.count > 0) {
      log.warning(
        `streamIncidentTail: ${beyondCapResponse.count} doc(s) lie beyond the ${maxTailMinutes}m ` +
          `tail cap and will NOT be streamed — the end of the snapshot (typically the incident) ` +
          `is being dropped. Increase the scenario's live.max_tail_minutes to at least its ` +
          `incident_onset_offset_minutes.`
      );
    }

    const streamStartMs = Date.now();
    let invalidTimestampDocs = 0;
    const docs: TailDoc[] = sources.flatMap((source) => {
      const sourceTs = source['@timestamp'];
      const sourceTsMs = sourceTs == null ? NaN : new Date(String(sourceTs)).getTime();
      // A NaN mapped timestamp would never become "due" and wedge the streaming loop forever.
      if (Number.isNaN(sourceTsMs)) {
        invalidTimestampDocs += 1;
        return [];
      }
      return [{ mappedTimestampMs: streamStartMs + (sourceTsMs - cutTimestampMs), source }];
    });
    if (invalidTimestampDocs > 0) {
      log.warning(
        `streamIncidentTail: dropped ${invalidTimestampDocs} doc(s) with missing/unparseable @timestamp`
      );
    }

    if (docs.length === 0) {
      log.warning('streamIncidentTail: no tail documents found — nothing to stream');
      return { total: 0, created: 0, skipped: 0, streamedMs: 0 };
    }

    const tailSpanMs = docs[docs.length - 1].mappedTimestampMs - streamStartMs;
    log.info(
      `streamIncidentTail: streaming ${docs.length} doc(s) over ~${Math.ceil(
        tailSpanMs / 60_000
      )} minute(s) of wall clock`
    );

    let cursor = 0;
    let created = 0;
    let skipped = 0;
    let lastProgressLog = Date.now();

    while (cursor < docs.length) {
      const now = Date.now();
      const due: TailDoc[] = [];
      while (cursor < docs.length && docs[cursor].mappedTimestampMs <= now) {
        due.push(docs[cursor]);
        cursor += 1;
      }

      if (due.length > 0) {
        const operations = due.flatMap((doc) => [
          { create: { _index: LOGS_STREAM_NAME } },
          { ...doc.source, '@timestamp': new Date(doc.mappedTimestampMs).toISOString() },
        ]);
        const bulkResponse = await esClient.bulk({ operations });
        for (const item of bulkResponse.items) {
          if (item.create?.error) {
            // Mapping conflicts are expected for a small fraction of docs (mirrors ReplayStats).
            skipped += 1;
          } else {
            created += 1;
          }
        }
      }

      if (Date.now() - lastProgressLog >= PROGRESS_LOG_EVERY_MS) {
        log.info(
          `streamIncidentTail: ${cursor}/${docs.length} doc(s) streamed (${created} indexed, ${skipped} skipped)`
        );
        lastProgressLog = Date.now();
      }

      if (cursor < docs.length) {
        const nextDueIn = docs[cursor].mappedTimestampMs - Date.now();
        await sleep(Math.max(Math.min(nextDueIn, TICK_INTERVAL_MS), 250));
      }
    }

    await esClient.indices.refresh({ index: `${LOGS_STREAM_NAME}*` }).catch(() => {});
    const streamedMs = Date.now() - streamStartMs;
    log.info(
      `streamIncidentTail: finished streaming ${created}/${docs.length} doc(s) in ${Math.round(
        streamedMs / 1000
      )}s (${skipped} skipped); waiting ${Math.round(
        postStreamWaitMs / 1000
      )}s for trailing rule executions`
    );

    await sleep(postStreamWaitMs);
    return { total: docs.length, created, skipped, streamedMs };
  } finally {
    for (const index of tempIndices) {
      await esClient.indices.delete({ index, ignore_unavailable: true }).catch(() => {});
    }
  }
}
