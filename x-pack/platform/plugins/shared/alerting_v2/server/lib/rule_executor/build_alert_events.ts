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
import type { AlertEvent, AlertEventSeverity } from '../../resources/datastreams/alert_events';
import {
  alertEventSeverity,
  buildRuleEventDocument,
} from '../../resources/datastreams/alert_events';
import type { ActiveAlertGroupHash } from './queries';

const SEVERITY_COLUMN = 'severity';
const SUPPORTED_SEVERITIES = new Set<AlertEventSeverity>(
  Object.values(alertEventSeverity) as AlertEventSeverity[]
);

/**
 * Best-effort severity extraction for breached alert events.
 *
 * The framework supports a fixed set of severity values. Users map their
 * source data severities into these values via the rule's ES|QL query,
 * which may emit a `severity` column. This helper:
 *
 * - returns `undefined` when the column is missing or not a string
 * - lowercases the value before comparing against the supported set
 * - returns the matching {@link AlertEventSeverity} or `undefined`
 *
 * Recovered and no-data events do not carry severity, so this is only
 * applied to breached events.
 */
function extractSeverity(rowDoc: Record<string, unknown>): AlertEventSeverity | undefined {
  const raw = rowDoc[SEVERITY_COLUMN];

  if (typeof raw !== 'string') {
    return undefined;
  }

  const normalized = raw.toLowerCase() as AlertEventSeverity;

  return SUPPORTED_SEVERITIES.has(normalized) ? normalized : undefined;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export const buildExecutionUuid = ({
  ruleId,
  spaceId,
  scheduledTimestamp,
  suffix,
}: {
  ruleId: string;
  spaceId: string;
  scheduledTimestamp: string;
  suffix?: string;
}): string => sha256(`${ruleId}|${spaceId}|${scheduledTimestamp}${suffix ? `|${suffix}` : ''}`);

export function buildGroupHash({
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
  const executionUuid = buildExecutionUuid({ ruleId, spaceId, scheduledTimestamp });

  // Timestamp when the alert event is written to the index.
  const wroteAt = new Date().toISOString();
  const source = 'internal';
  const groupingFields = ruleAttributes.grouping?.fields ?? [];
  let index = 0;

  return (batch: Array<Record<string, unknown>>): AlertEvent[] => {
    const alertEventsBatch: AlertEvent[] = [];

    for (const rowDoc of batch) {
      const groupHash = buildGroupHash({
        rowDoc,
        groupKeyFields: groupingFields,
        get fallbackSeed(): string {
          return `${executionUuid}|row:${index}|${stableStringify(rowDoc)}`;
        },
      });

      const doc = buildRuleEventDocument({
        '@timestamp': wroteAt,
        scheduled_timestamp: scheduledTimestamp,
        rule: { id: ruleId, version: ruleVersion },
        group_hash: groupHash,
        data: rowDoc,
        status: 'breached',
        source,
        type: 'signal',
        space_id: spaceId,
        severity: extractSeverity(rowDoc),
      });

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
  dataPresentGroupHashes?: ReadonlySet<string>;
}

/**
 * Creates `recovered` alert events for groups that were previously in a non-inactive
 * episode state but are no longer present in the current breached set.
 *
 * Used when no recover query is configured on the rule.
 */
export function buildRecoveryAlertEvents({
  ruleId,
  ruleVersion,
  spaceId,
  activeGroupHashes,
  breachedGroupHashes,
  scheduledTimestamp,
  dataPresentGroupHashes,
}: BuildRecoveryAlertEventsOpts): AlertEvent[] {
  const wroteAt = new Date().toISOString();

  return activeGroupHashes
    .filter(
      ({ group_hash }) =>
        !breachedGroupHashes.has(group_hash) &&
        (dataPresentGroupHashes == null || dataPresentGroupHashes.has(group_hash))
    )
    .map(({ group_hash }) =>
      buildRuleEventDocument({
        '@timestamp': wroteAt,
        scheduled_timestamp: scheduledTimestamp,
        rule: { id: ruleId, version: ruleVersion },
        group_hash,
        data: {},
        status: 'recovered',
        source: 'internal',
        type: 'signal',
        space_id: spaceId,
      })
    );
}

export interface BuildContinuedBreachAlertEventsOpts {
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
  groupHashes: string[];
  scheduledTimestamp: string;
}

/**
 * Creates continued `breached` alert events for the supplied group hashes.
 *
 * Used when active group that is absent from the breach batch and did not match the
 * recovery query, but still has data.
 */
export function buildContinuedBreachAlertEvents({
  ruleId,
  ruleVersion,
  spaceId,
  groupHashes,
  scheduledTimestamp,
}: BuildContinuedBreachAlertEventsOpts): AlertEvent[] {
  const wroteAt = new Date().toISOString();

  return groupHashes.map((groupHash) => ({
    '@timestamp': wroteAt,
    scheduled_timestamp: scheduledTimestamp,
    rule: { id: ruleId, version: ruleVersion },
    group_hash: groupHash,
    data: {},
    status: 'breached' as const,
    source: 'internal',
    type: 'signal' as const,
    space_id: spaceId,
  }));
}

export interface BuildNoDataAlertEventsOpts {
  ruleId: string;
  ruleVersion: number;
  spaceId: string;
  groupHashes: string[];
  scheduledTimestamp: string;
}

/**
 * Creates `no_data` alert events for the supplied group hashes.
 *
 * Used when no_data_strategy is configured on the rule.
 */
export function buildNoDataAlertEvents({
  ruleId,
  ruleVersion,
  spaceId,
  groupHashes,
  scheduledTimestamp,
}: BuildNoDataAlertEventsOpts): AlertEvent[] {
  const wroteAt = new Date().toISOString();

  return groupHashes.map((groupHash) => ({
    '@timestamp': wroteAt,
    scheduled_timestamp: scheduledTimestamp,
    rule: { id: ruleId, version: ruleVersion },
    group_hash: groupHash,
    data: {},
    status: 'no_data' as const,
    source: 'internal',
    type: 'signal' as const,
    space_id: spaceId,
  }));
}

export function rowToDocument(
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
  breachedGroupHashes: Set<string>;
  esqlResponse: EsqlQueryResponse;
  scheduledTimestamp: string;
}
/**
 * Creates `recovered` alert events by running a custom recovery query.
 *
 * Active groups whose group hash matches a row in the recovery query results
 * are considered recovered. Used when the rule has a recover query configured.
 *
 * Breach always takes priority: groups present in the current breach batch are
 * excluded even if the recovery query also matched them.
 */
export function buildQueryRecoveryAlertEvents({
  ruleId,
  ruleVersion,
  spaceId,
  ruleAttributes,
  activeGroupHashes,
  breachedGroupHashes,
  esqlResponse,
  scheduledTimestamp,
}: BuildQueryRecoveryAlertEventsOpts): AlertEvent[] {
  const columns = esqlResponse.columns ?? [];
  const values = esqlResponse.values ?? [];

  if (columns.length === 0 || values.length === 0) {
    return [];
  }

  const executionUuid = buildExecutionUuid({
    ruleId,
    spaceId,
    scheduledTimestamp,
    suffix: 'recovery',
  });
  const groupingFields = ruleAttributes.grouping?.fields ?? [];
  const activeGroupHashSet = new Set(activeGroupHashes.map(({ group_hash }) => group_hash));

  // Keep the first matching row's data per group hash.
  const recoveredByGroupHash = new Map<string, Record<string, unknown>>();

  for (let i = 0; i < values.length; i++) {
    const rowDoc = rowToDocument(columns, values[i]);
    const groupHash = buildGroupHash({
      rowDoc,
      groupKeyFields: groupingFields,
      get fallbackSeed(): string {
        return `${executionUuid}|row:${i}|${stableStringify(rowDoc)}`;
      },
    });

    if (
      activeGroupHashSet.has(groupHash) &&
      !breachedGroupHashes.has(groupHash) &&
      !recoveredByGroupHash.has(groupHash)
    ) {
      recoveredByGroupHash.set(groupHash, rowDoc);
    }
  }

  if (recoveredByGroupHash.size === 0) {
    return [];
  }

  const wroteAt = new Date().toISOString();

  return Array.from(recoveredByGroupHash).map(([groupHash, data]) =>
    buildRuleEventDocument({
      '@timestamp': wroteAt,
      scheduled_timestamp: scheduledTimestamp,
      rule: { id: ruleId, version: ruleVersion },
      group_hash: groupHash,
      data,
      status: 'recovered',
      source: 'internal',
      type: 'signal',
      space_id: spaceId,
    })
  );
}
