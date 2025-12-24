/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';

import type { RawEsqlRule } from '../saved_objects';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function rowToDocument(
  columns: Array<{ name: string }>,
  row: Array<string | number | boolean | null>
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    doc[columns[i].name] = row[i];
  }
  return doc;
}

function buildGroupingKey({
  rowDoc,
  groupKeyFields,
  fallbackSeed,
}: {
  rowDoc: Record<string, unknown>;
  groupKeyFields: string[];
  fallbackSeed: string;
}) {
  if (!groupKeyFields || groupKeyFields.length === 0) {
    return sha256(fallbackSeed);
  }

  const parts = groupKeyFields.map((f) => `${f}=${String(rowDoc[f] ?? '')}`);
  const key = parts.join('|');
  return key.length > 0 ? key : sha256(fallbackSeed);
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
    rawRule: RawEsqlRule;
    esqlResponse: ESQLSearchResponse;
    /**
     * Stable identifier for this task run (used for deterministic ids to avoid duplicates on retry).
     */
    taskRunKey: string;
  };
}

export async function writeEsqlAlerts({
  services: { logger, esClient, dataStreamName },
  input: { ruleId, spaceId, rawRule, esqlResponse, taskRunKey },
}: WriteEsqlAlertsOpts) {
  const columns = esqlResponse.columns ?? [];
  const values = esqlResponse.values ?? [];

  if (columns.length === 0 || values.length === 0) {
    return { created: 0 };
  }

  // Stable per run to support retries without duplicating documents.
  // Include spaceId to avoid collisions when multiple spaces write into the same data stream.
  const executionUuid = sha256(`${ruleId}|${spaceId}|${taskRunKey}`);

  const now = new Date().toISOString();
  const operations: Array<Record<string, unknown>> = values.flatMap((valueRow, i) => {
    const row = valueRow as Array<string | number | boolean | null>;
    const rowDoc = rowToDocument(columns, row);
    const groupingKey = buildGroupingKey({
      rowDoc,
      groupKeyFields: rawRule.groupKey ?? [],
      fallbackSeed: `${executionUuid}|row:${i}|${JSON.stringify(rowDoc)}`,
    });

    const alertUuid = sha256(`${executionUuid}|${groupingKey}|row:${i}`);

    const doc = {
      '@timestamp': now,
      alert: {
        producer: 'framework',
        uuid: alertUuid,
        grouping: { key: groupingKey },
        rule: {
          uuid: ruleId,
          execution: { uuid: executionUuid },
        },
        attributes: rowDoc,
      },
      labels: {
        kibana_space_id: spaceId,
      },
      ...(rawRule.tags?.length ? { tags: rawRule.tags } : {}),
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
