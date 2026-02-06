/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';

import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { AlertEvent } from '../../resources/alert_events';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function buildGroupHash({
  rowDoc,
  groupKeyFields,
  fallbackSeed,
}: {
  rowDoc: Record<string, unknown>;
  groupKeyFields: string[];
  fallbackSeed: string;
}): string {
  if (!groupKeyFields || groupKeyFields.length === 0) {
    return sha256(fallbackSeed);
  }

  const keyPart = groupKeyFields.join('|');
  const valuePart = groupKeyFields.map((f) => String(rowDoc[f] ?? '')).join('|');

  return sha256(`${keyPart}|${valuePart}`);
}

export interface BuildAlertEventsBaseOpts {
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
  ruleAttributes: RuleSavedObjectAttributes;
  /**
   * Stable identifier for this task run (used for deterministic ids to avoid duplicates on retry).
   */
  scheduledTimestamp: string;
}

export interface BuildAlertEventsStreamOpts extends BuildAlertEventsBaseOpts {
  rowBatchStream: AsyncIterable<Array<Record<string, unknown>>>;
}

export type AlertEventsBatchBuilder = (batch: Array<Record<string, unknown>>) => AlertEvent[];

export function createAlertEventsBatchBuilder({
  ruleId,
  ruleVersion,
  spaceId,
  ruleAttributes,
  scheduledTimestamp,
}: BuildAlertEventsBaseOpts): AlertEventsBatchBuilder {
  // Stable per run to support retries without duplicating documents.
  // Include spaceId to avoid collisions when multiple spaces write into the same data stream.
  const executionUuid = sha256(`${ruleId}|${spaceId}|${scheduledTimestamp}`);

  // Timestamp when the alert event is written to the index.
  const wroteAt = new Date().toISOString();
  const source = 'internal';
  let index = 0;

  return (batch: Array<Record<string, unknown>>): AlertEvent[] => {
    const alertEventsBatch: AlertEvent[] = [];

    for (const rowDoc of batch) {
      const groupHash = buildGroupHash({
        rowDoc,
        groupKeyFields: ruleAttributes.groupingKey ?? [],
        get fallbackSeed(): string {
          return `${executionUuid}|row:${index}|${stringify(rowDoc)}`;
        },
      });

      const doc: AlertEvent = {
        '@timestamp': wroteAt,
        scheduled_timestamp: scheduledTimestamp,
        rule: {
          id: ruleId,
          version: ruleVersion,
        },
        group_hash: groupHash,
        data: rowDoc,
        status: 'breached',
        source,
        type: 'signal',
      };

      index++;
      alertEventsBatch.push(doc);
    }

    return alertEventsBatch;
  };
}

export async function* buildAlertEventsFromRowBatchStream({
  ruleId,
  ruleVersion,
  spaceId,
  ruleAttributes,
  rowBatchStream,
  scheduledTimestamp,
}: BuildAlertEventsStreamOpts): AsyncIterable<AlertEvent[]> {
  const buildBatch = createAlertEventsBatchBuilder({
    ruleId,
    ruleVersion,
    spaceId,
    ruleAttributes,
    scheduledTimestamp,
  });

  for await (const batch of rowBatchStream) {
    const alertEventsBatch = buildBatch(batch);

    if (alertEventsBatch.length > 0) {
      yield alertEventsBatch;
    }
  }
}
