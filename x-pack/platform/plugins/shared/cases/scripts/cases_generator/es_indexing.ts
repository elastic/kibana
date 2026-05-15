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

// Tallies how many alerts each owner needs across `cases`, indexes that many
// docs into the right index per owner, and returns a map keyed by owner so
// case_generation.ts can hand out alert attachments without re-indexing.
// Called once per space by run.ts when --alerts > 0.
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
  for (const [owner, count] of alertsNeededByOwner.entries()) {
    const alertIndex = getAlertsIndex(owner, ctx.space);
    logger.info(`Indexing ${count} alerts into ${alertIndex} for owner "${owner}"...`);
    alertsByOwner.set(owner, await bulkIndexAlerts(esClient, alertIndex, count, owner, ctx));
  }

  return alertsByOwner;
}
