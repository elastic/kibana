/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { CasePostRequest } from '../../common';
import { logger } from './logger';
import {
  generateObservabilityAlert,
  generateProcessEvent,
  generateSecurityAlert,
  getAlertsIndex,
} from './data_generation';
import type { DocGeneratorContext } from './data_generation';
import type { AlertInfo, EventInfo } from './types';

const ALERT_CHUNK_SIZE = 500;
const EVENT_CHUNK_SIZE = 500;

// Stays below the ES default `index.max_result_window` (10,000). A search
// with `from + size` at or above the ceiling 400s with "Result window is
// too large", which would knock the reuse path out and force the run to
// re-index everything every time. Capping the fetch size below the default
// keeps reuse working; the case-attachment loop already cycles through the
// returned pool to cover any extra cases beyond the cap.
const MAX_REUSE_FETCH_SIZE = 9999;

// Returns the doc count for `index` (or 0 when the index doesn't exist or the
// count request errors out). Used by the reuse path so we can decide whether
// to skip indexing entirely or top up the missing delta.
async function countExistingDocs(esClient: Client, index: string): Promise<number> {
  try {
    const res = await esClient.count({ index, ignore_unavailable: true });
    return typeof res.count === 'number' ? res.count : 0;
  } catch {
    return 0;
  }
}

interface AlertSource {
  ['kibana.alert.uuid']?: string;
  ['kibana.alert.rule.uuid']?: string;
  ['kibana.alert.rule.name']?: string;
}

// Fetches up to `count` existing alert refs from `index`, capped at
// MAX_REUSE_FETCH_SIZE. Used when the alerts index already contains enough
// docs so the run can skip (or partially skip) generating new alerts.
// Missing rule metadata is filled with conservative defaults so attachments
// still succeed.
async function fetchExistingAlerts(
  esClient: Client,
  index: string,
  count: number
): Promise<AlertInfo[]> {
  if (count <= 0) return [];
  const fetchSize = Math.min(count, MAX_REUSE_FETCH_SIZE);
  if (fetchSize < count) {
    logger.info(
      `  [${index}] reuse pool capped at ${MAX_REUSE_FETCH_SIZE} (requested ${count}); attachments cycle through the cap to cover the rest.`
    );
  }
  try {
    const res = await esClient.search<AlertSource>({
      index,
      size: fetchSize,
      _source: ['kibana.alert.uuid', 'kibana.alert.rule.uuid', 'kibana.alert.rule.name'],
      query: { match_all: {} },
      ignore_unavailable: true,
    });
    return res.hits.hits.map((hit) => ({
      alertId: hit._source?.['kibana.alert.uuid'] ?? (hit._id as string),
      index,
      ruleId: hit._source?.['kibana.alert.rule.uuid'] ?? 'existing-rule',
      ruleName: hit._source?.['kibana.alert.rule.name'] ?? 'Existing Rule',
    }));
  } catch (err) {
    logger.warning(
      `Failed to fetch existing alerts from ${index} (${
        (err as Error).message
      }); will fall back to indexing fresh alerts.`
    );
    return [];
  }
}

// Fetches up to `count` existing event ids from `index`, capped at
// MAX_REUSE_FETCH_SIZE. Mirrors fetchExistingAlerts but for the
// process-events data stream.
async function fetchExistingEvents(
  esClient: Client,
  index: string,
  count: number
): Promise<EventInfo[]> {
  if (count <= 0) return [];
  const fetchSize = Math.min(count, MAX_REUSE_FETCH_SIZE);
  if (fetchSize < count) {
    logger.info(
      `  [${index}] reuse pool capped at ${MAX_REUSE_FETCH_SIZE} (requested ${count}); attachments cycle through the cap to cover the rest.`
    );
  }
  try {
    const res = await esClient.search({
      index,
      size: fetchSize,
      _source: false,
      query: { match_all: {} },
      ignore_unavailable: true,
    });
    return res.hits.hits
      .filter((hit) => typeof hit._id === 'string')
      .map((hit) => ({ eventId: hit._id as string, index }));
  } catch (err) {
    logger.warning(
      `Failed to fetch existing events from ${index} (${
        (err as Error).message
      }); will fall back to indexing fresh events.`
    );
    return [];
  }
}

// Generates `count` alert documents for `owner` and bulk-indexes them into
// `alertIndex` in chunks. Returns the alertId/ruleId/ruleName tuples for each
// successfully indexed doc, which are later used to build alert attachments.
// Called by indexAlertsForOwners.
export async function bulkIndexAlerts(
  esClient: Client,
  alertIndex: string,
  count: number,
  owner: string,
  ctx: DocGeneratorContext
): Promise<AlertInfo[]> {
  const generator = owner === 'observability' ? generateObservabilityAlert : generateSecurityAlert;
  const indexedAlerts: AlertInfo[] = [];

  for (let start = 0; start < count; start += ALERT_CHUNK_SIZE) {
    const chunkSize = Math.min(ALERT_CHUNK_SIZE, count - start);
    const chunk = Array.from({ length: chunkSize }, (_, i) => generator(start + i, ctx));
    const operations = chunk.flatMap((alert) => [
      { index: { _index: alertIndex, _id: alert._id } },
      alert._source,
    ]);

    const res = await esClient.bulk({
      operations,
      refresh: start + chunkSize >= count ? 'wait_for' : false,
    });

    if (res.errors) {
      logger.error(
        `Bulk index errors: ${JSON.stringify(
          res.items.filter((item) => item.index?.error).slice(0, 3)
        )}`
      );
    }

    res.items.forEach((item, i) => {
      if (item.index?._id && !item.index.error) {
        const alert = chunk[i];
        indexedAlerts.push({
          alertId: alert._id,
          index: alertIndex,
          ruleId: alert.ruleId,
          ruleName: alert.ruleName,
        });
      }
    });

    logger.info(`  [${alertIndex}] ${Math.min(start + chunkSize, count)}/${count}`);
  }

  return indexedAlerts;
}

// Generates `count` process-event documents and bulk-indexes them into
// `eventIndex`. Returns eventId/index pairs for the docs that were created
// successfully, used later to build event attachments. Called by run.ts when
// --events > 0 and at least one non-observability case is being generated.
export async function bulkIndexEvents(
  esClient: Client,
  eventIndex: string,
  count: number,
  ctx: DocGeneratorContext
): Promise<EventInfo[]> {
  const allEventInfos: EventInfo[] = [];

  for (let start = 0; start < count; start += EVENT_CHUNK_SIZE) {
    const chunkSize = Math.min(EVENT_CHUNK_SIZE, count - start);
    const chunk = Array.from({ length: chunkSize }, () => generateProcessEvent(ctx));
    const operations = chunk.flatMap((eventDocument) => [
      { create: { _index: eventIndex } },
      eventDocument,
    ]);

    const res = await esClient.bulk({
      operations,
      refresh: start + chunkSize >= count ? 'wait_for' : false,
    });

    if (res.errors) {
      logger.error(
        `Bulk index errors: ${JSON.stringify(
          res.items.filter((item) => item.create?.error).slice(0, 3)
        )}`
      );
    }

    for (const item of res.items) {
      if (item.create?._id && !item.create.error) {
        allEventInfos.push({ eventId: item.create._id, index: eventIndex });
      }
    }

    logger.info(`  [${eventIndex}] ${Math.min(start + chunkSize, count)}/${count}`);
  }

  return allEventInfos;
}

// Tallies how many alerts each owner needs across `cases`, then for each
// owner either reuses already-indexed docs from the target alerts index, tops
// up the missing delta with newly indexed docs, or indexes the full batch.
// Returns a map keyed by owner so case_generation.ts can hand out alert
// attachments without re-indexing. Called once per space by run.ts when
// --alerts > 0.
export async function indexAlertsForOwners(
  esClient: Client,
  cases: CasePostRequest[],
  alertsPerCase: number,
  ctx: DocGeneratorContext
): Promise<Map<string, AlertInfo[]>> {
  const alertsNeededByOwner = new Map<string, number>();
  for (const oneCase of cases) {
    alertsNeededByOwner.set(
      oneCase.owner,
      (alertsNeededByOwner.get(oneCase.owner) ?? 0) + alertsPerCase
    );
  }

  const alertsByOwner = new Map<string, AlertInfo[]>();
  for (const [owner, needed] of alertsNeededByOwner.entries()) {
    if (needed > 0) {
      alertsByOwner.set(owner, await resolveAlertsForOwner(esClient, owner, needed, ctx));
    }
  }

  return alertsByOwner;
}

// Resolves the pool of AlertInfo for a single owner by reusing existing docs
// in the target alerts index, topping up the missing delta with newly indexed
// docs, or indexing the full batch when the index is empty. Extracted so the
// outer loop in indexAlertsForOwners can stay flat and avoid `continue`.
async function resolveAlertsForOwner(
  esClient: Client,
  owner: string,
  needed: number,
  ctx: DocGeneratorContext
): Promise<AlertInfo[]> {
  const alertIndex = getAlertsIndex(owner, ctx.space);
  const existingCount = await countExistingDocs(esClient, alertIndex);

  if (existingCount >= needed) {
    logger.info(
      `Reusing ${needed} existing alert(s) from ${alertIndex} for owner "${owner}" (${existingCount} present)`
    );
    return fetchExistingAlerts(esClient, alertIndex, needed);
  }

  const toIndex = needed - existingCount;
  const reused =
    existingCount > 0 ? await fetchExistingAlerts(esClient, alertIndex, existingCount) : [];
  if (reused.length > 0) {
    logger.info(
      `Reusing ${reused.length} existing alert(s) from ${alertIndex} and topping up ${toIndex} new doc(s) for owner "${owner}"`
    );
  } else {
    logger.info(`Indexing ${toIndex} alert(s) into ${alertIndex} for owner "${owner}"...`);
  }
  const fresh = await bulkIndexAlerts(esClient, alertIndex, toIndex, owner, ctx);
  return [...reused, ...fresh];
}

// Indexes (or reuses) up to `count` events in the endpoint events data
// stream, returning the full EventInfo pool. Uses the same reuse/top-up
// policy as indexAlertsForOwners so a fresh run on top of an existing dataset
// doesn't re-emit duplicate events. Called by run.ts when --events > 0 and
// at least one non-observability case is being generated.
export async function indexOrReuseEvents(
  esClient: Client,
  eventIndex: string,
  count: number,
  ctx: DocGeneratorContext
): Promise<EventInfo[]> {
  if (count <= 0) return [];
  const existingCount = await countExistingDocs(esClient, eventIndex);

  if (existingCount >= count) {
    logger.info(`Reusing ${count} existing event(s) from ${eventIndex} (${existingCount} present)`);
    return fetchExistingEvents(esClient, eventIndex, count);
  }

  const toIndex = count - existingCount;
  const reused =
    existingCount > 0 ? await fetchExistingEvents(esClient, eventIndex, existingCount) : [];
  if (reused.length > 0) {
    logger.info(
      `Reusing ${reused.length} existing event(s) from ${eventIndex} and topping up ${toIndex} new doc(s)`
    );
  } else {
    logger.info(`Indexing ${toIndex} event(s) into ${eventIndex}...`);
  }
  const fresh = await bulkIndexEvents(esClient, eventIndex, toIndex, ctx);
  return [...reused, ...fresh];
}
