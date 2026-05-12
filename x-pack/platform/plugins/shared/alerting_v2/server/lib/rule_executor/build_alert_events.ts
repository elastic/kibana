/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { stableStringify } from '@kbn/std';

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEvent } from '../../resources/datastreams/alert_events';
import type { ActiveAlertGroupHash } from './queries';

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
  ruleAttributes: Pick<RuleResponse, 'grouping'>;
  /**
   * Stable identifier for this task run (used for deterministic ids to avoid duplicates on retry).
   */
  scheduledTimestamp: string;
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
        groupKeyFields: ruleAttributes.grouping?.fields ?? [],
        get fallbackSeed(): string {
          return `${executionUuid}|row:${index}|${stableStringify(rowDoc)}`;
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
        space_id: spaceId,
      };

      index++;
      alertEventsBatch.push(doc);
    }

    return alertEventsBatch;
  };
}

export interface BuildRecoveryAlertEventsOpts {
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
  activeGroupHashes: ActiveAlertGroupHash[];
  breachedGroupHashes: Set<string>;
  scheduledTimestamp: string;
}

/**
 * Creates `recovered` alert events for groups that were previously in a non-inactive
 * episode state but are no longer present in the current breached set.
 *
 * Used when `recovery_policy.type` is `no_breach` or unset.
 */
export function buildRecoveryAlertEvents({
  ruleId,
  ruleVersion,
  spaceId,
  activeGroupHashes,
  breachedGroupHashes,
  scheduledTimestamp,
}: BuildRecoveryAlertEventsOpts): AlertEvent[] {
  const wroteAt = new Date().toISOString();

  return activeGroupHashes
    .filter(({ group_hash }) => !breachedGroupHashes.has(group_hash))
    .map(({ group_hash }) => ({
      '@timestamp': wroteAt,
      scheduled_timestamp: scheduledTimestamp,
      rule: { id: ruleId, version: ruleVersion },
      group_hash,
      data: {},
      status: 'recovered' as const,
      source: 'internal',
      type: 'signal' as const,
      space_id: spaceId,
    }));
}

function rowToDocument(
  columns: EsqlQueryResponse['columns'],
  row: unknown[]
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    doc[columns[i].name] = row[i];
  }
  return doc;
}

export interface BuildQueryRecoveryAlertEventsOpts {
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
  ruleAttributes: Pick<RuleResponse, 'grouping'>;
  activeGroupHashes: ActiveAlertGroupHash[];
  esqlResponse: EsqlQueryResponse;
  scheduledTimestamp: string;
}

/**
 * Creates `recovered` alert events by running a custom recovery query.
 *
 * Active groups whose group hash matches a row in the recovery query results
 * are considered recovered. Used when `recovery_policy.type` is `query`.
 */
export function buildQueryRecoveryAlertEvents({
  ruleId,
  ruleVersion,
  spaceId,
  ruleAttributes,
  activeGroupHashes,
  esqlResponse,
  scheduledTimestamp,
}: BuildQueryRecoveryAlertEventsOpts): AlertEvent[] {
  const columns = esqlResponse.columns ?? [];
  const values = esqlResponse.values ?? [];

  if (columns.length === 0 || values.length === 0) {
    return [];
  }

  const executionUuid = sha256(`${ruleId}|${spaceId}|${scheduledTimestamp}|recovery`);
  const activeGroupHashSet = new Set(activeGroupHashes.map(({ group_hash }) => group_hash));

  // Keep the first matching row's data per group hash.
  const recoveredByGroupHash = new Map<string, Record<string, unknown>>();

  for (let i = 0; i < values.length; i++) {
    const rowDoc = rowToDocument(columns, values[i]);
    const groupHash = buildGroupHash({
      rowDoc,
      groupKeyFields: ruleAttributes.grouping?.fields ?? [],
      get fallbackSeed(): string {
        return `${executionUuid}|row:${i}|${stableStringify(rowDoc)}`;
      },
    });

    if (activeGroupHashSet.has(groupHash) && !recoveredByGroupHash.has(groupHash)) {
      recoveredByGroupHash.set(groupHash, rowDoc);
    }
  }

  if (recoveredByGroupHash.size === 0) {
    return [];
  }

  const wroteAt = new Date().toISOString();

  return Array.from(recoveredByGroupHash).map(([groupHash, data]) => ({
    '@timestamp': wroteAt,
    scheduled_timestamp: scheduledTimestamp,
    rule: { id: ruleId, version: ruleVersion },
    group_hash: groupHash,
    data,
    status: 'recovered' as const,
    source: 'internal',
    type: 'signal' as const,
    space_id: spaceId,
  }));
}
