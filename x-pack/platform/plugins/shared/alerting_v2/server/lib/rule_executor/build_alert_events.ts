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

function buildGrouping({
  rowDoc,
  groupKeyFields,
  fallbackSeed,
}: {
  rowDoc: Record<string, unknown>;
  groupKeyFields: string[];
  fallbackSeed: string;
}) {
  if (!groupKeyFields || groupKeyFields.length === 0) {
    return {
      key: 'default',
      value: sha256(fallbackSeed),
    };
  }

  const key = groupKeyFields.join('|');
  const value = groupKeyFields.map((f) => String(rowDoc[f] ?? '')).join('|');

  return {
    key: key.length > 0 ? key : 'default',
    value: value.length > 0 ? value : sha256(fallbackSeed),
  };
}

export interface BuildAlertEventsOpts {
  input: {
    ruleId: string;
    spaceId: string;
    ruleAttributes: RuleSavedObjectAttributes;
    esqlResponse: ESQLSearchResponse;
    /**
     * Stable identifier for this task run (used for deterministic ids to avoid duplicates on retry).
     */
    scheduledTimestamp: string;
  };
}

export function buildAlertEventsFromEsqlResponse({
  input: { ruleId, spaceId, ruleAttributes, esqlResponse, scheduledTimestamp },
}: BuildAlertEventsOpts): Array<{ id: string; doc: Record<string, unknown> }> {
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
    const grouping = buildGrouping({
      rowDoc,
      groupKeyFields: ruleAttributes.groupingKey ?? [],
      get fallbackSeed(): string {
        return `${executionUuid}|row:${i}|${stringify(rowDoc)}`;
      },
    });

    // Include `source` in the tuple to prevent collisions when we later support external systems whose ids may overlap with internal rule ids.
    const alertSeriesId = sha256(
      `${source}|${ruleId}|${spaceId}|${grouping.key}|${grouping.value}`
    );
    // Deterministic document id: hash(@timestamp + alert_series_id)
    const alertUuid = sha256(`${wroteAt}|${alertSeriesId}`);

    const doc: Record<string, unknown> = {
      '@timestamp': wroteAt,
      scheduled_timestamp: scheduledTimestamp,
      rule: {
        id: ruleId,
        ...(ruleAttributes.tags?.length ? { tags: ruleAttributes.tags } : {}),
      },
      grouping,
      data: rowDoc,
      status: 'breach',
      alert_series_id: alertSeriesId,
      source,
      ...(ruleAttributes.tags?.length ? { tags: ruleAttributes.tags } : {}),
    };

    return { id: alertUuid, doc };
  });
}
