/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ESQLSearchResponse, ESQLRow } from '@kbn/es-types';
import stringify from 'json-stable-stringify';

import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { AlertEvent } from '../../resources/alert_events';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function rowToDocument(columns: Array<{ name: string }>, row: ESQLRow): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    doc[columns[i].name] = row[i];
  }
  return doc;
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

export interface BuildAlertEventsOpts {
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
  ruleAttributes: RuleSavedObjectAttributes;
  esqlResponse: ESQLSearchResponse;
  /**
   * Stable identifier for this task run (used for deterministic ids to avoid duplicates on retry).
   */
  scheduledTimestamp: string;
}

export function buildAlertEventsFromEsqlResponse({
  ruleId,
  ruleVersion,
  spaceId,
  ruleAttributes,
  esqlResponse,
  scheduledTimestamp,
}: BuildAlertEventsOpts): Array<{ id: string; doc: AlertEvent }> {
  const columns = esqlResponse.columns ?? [];
  const values = esqlResponse.values ?? [];

  if (columns.length === 0 || values.length === 0) {
    return [];
  }

  // Stable per run to support retries without duplicating documents.
  // Include spaceId to avoid collisions when multiple spaces write into the same data stream.
  const executionUuid = sha256(`${ruleId}|${spaceId}|${scheduledTimestamp}`);

  // Timestamp when the alert event is written to the index.
  const wroteAt = new Date().toISOString();
  const source = 'internal';

  return values.map((row, i) => {
    const rowDoc = rowToDocument(columns, row);
    const groupHash = buildGroupHash({
      rowDoc,
      groupKeyFields: ruleAttributes.groupingKey ?? [],
      get fallbackSeed(): string {
        return `${executionUuid}|row:${i}|${stringify(rowDoc)}`;
      },
    });

    // Deterministic document id: hash(@timestamp + rule_id + space_id + group_hash)
    const alertUuid = sha256(`${wroteAt}|${ruleId}|${spaceId}|${groupHash}`);

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
      type: 'signal', // Initial events are signals; they become alerts after episode processing
      // TODO: episode_id, episode_status, episode_status_count are populated during episode processing
    };

    return { id: alertUuid, doc };
  });
}
