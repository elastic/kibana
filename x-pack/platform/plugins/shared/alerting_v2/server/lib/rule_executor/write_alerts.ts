/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse, ESQLRow } from '@kbn/es-types';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
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

export interface WriteEsqlAlertsOpts {
  services: {
    logger: Logger;
    esClient: ElasticsearchClient;
    dataStreamName: string;
  };
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

export async function writeEsqlAlerts({
  services: { logger, esClient, dataStreamName },
  input: { ruleId, spaceId, ruleAttributes, esqlResponse, scheduledTimestamp },
}: WriteEsqlAlertsOpts) {
  const columns = esqlResponse.columns ?? [];
  const values = esqlResponse.values ?? [];

  if (columns.length === 0 || values.length === 0) {
    return { created: 0 };
  }

  // Stable per run to support retries without duplicating documents.
  // Include spaceId to avoid collisions when multiple spaces write into the same data stream.
  const executionUuid = sha256(`${ruleId}|${spaceId}|${scheduledTimestamp}`);

  // Timestamp when the alert event is written to the index.
  const wroteAt = new Date().toISOString();
  const source = 'internal';
  const operations: Array<Record<string, unknown>> = values.flatMap((valueRow, i) => {
    const row = valueRow;
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

    const doc = {
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

    return [{ create: { _index: dataStreamName, _id: alertUuid } }, doc];
  });

  const res = await esClient.bulk({
    index: dataStreamName,
    refresh: false,
    operations,
  });

  if (res.errors) {
    const bulkResponse = res as unknown as BulkResponse;
    const firstErr = bulkResponse.items.find((i) => i.create?.error)?.create?.error;
    throw new Error(
      `Failed to bulk index alerts to ${dataStreamName}: ${firstErr?.type ?? 'unknown'} ${
        firstErr?.reason ?? ''
      }`
    );
  }

  logger.debug(`Indexed ${values.length} ES|QL alerts into ${dataStreamName}`);
  return { created: values.length };
}
