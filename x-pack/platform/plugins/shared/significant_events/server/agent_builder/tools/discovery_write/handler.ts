/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dateMath from '@kbn/datemath';
import { type Discovery, type SignalEntry } from '@kbn/significant-events-schema';
import type { DiscoveryClient } from '../../../lib/significant_events/discoveries';
import {
  assertUniqueBulkWriteKeys,
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
  type CompactBulkError,
  toCompactBulkError,
} from '../bulk_write';

export type DiscoveryWriteInput = Pick<
  Discovery,
  | 'kind'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'severity'
  | 'stream_names'
  | 'confidence'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'previous_discovery_id'
  | 'workflow_execution_id'
  | 'conversation_id'
> & {
  /** Omit for new events. Pass verbatim for a continuation. */
  event_id?: Discovery['event_id'];
  /** Deduplication window (ES date math, e.g. `"now-1h"`). Not stored. */
  dedup_window?: string;
};

export interface DiscoveryWriteSuccessResult {
  index: number;
  discovery_id: string;
  event_id: string;
  kind: Discovery['kind'];
  written: true;
}

export interface DiscoveryWriteDuplicateResult {
  index: number;
  discovery_id: string;
  event_id: string;
  kind: Discovery['kind'];
  written: false;
  skipped: true;
  reason: 'duplicate_within_window';
  existing_discovery_id: string;
}

export interface DiscoveryWriteFailureResult {
  index: number;
  discovery_id: string;
  event_id: string;
  kind: Discovery['kind'];
  written: false;
  reason: 'bulk_error';
  error: CompactBulkError;
}

export type DiscoveryWriteResult = DiscoveryWriteSuccessResult | DiscoveryWriteDuplicateResult;
export type DiscoveryWriteBulkResult = DiscoveryWriteResult | DiscoveryWriteFailureResult;

/** `rule_uuid` from every detection signal, deduplicated. */
const extractRuleUuids = (signals: SignalEntry[] | undefined): string[] => {
  const uuids = (signals ?? [])
    .filter((signal): signal is Extract<SignalEntry, { type: 'detection' }> =>
      Boolean(signal.type === 'detection' && signal.metadata.rule_uuid)
    )
    .map((signal) => signal.metadata.rule_uuid as string);
  return [...new Set(uuids)];
};

export const generateEventId = (streamNames: string[], ruleUuids: string[]): string => {
  const suffix = uuidv4().replace(/-/g, '').slice(0, 8);
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  const basis = [primaryStream, ...[...ruleUuids].sort(), suffix].join('|');
  return createHash('sha256').update(basis).digest('hex').slice(0, 16);
};

export const makeFingerprint = (streamNames: string[], ruleUuids: string[]): string => {
  const primaryStream = [...streamNames].sort()[0] ?? 'unknown';
  return [primaryStream, ...[...ruleUuids].sort()].join('|');
};

const isDateMathExpression = (value: string): boolean =>
  value.startsWith('now') || value.includes('||');

const parseDateMathToMs = (expr: string, now: Date): number | undefined => {
  if (!isDateMathExpression(expr)) {
    return undefined;
  }
  const parsed = dateMath.parse(expr, { forceNow: now });
  return parsed?.isValid() ? now.getTime() - parsed.valueOf() : undefined;
};

export const mergeSignalsLatestPerRule = (
  priorDocs: Array<Pick<Discovery, '@timestamp' | 'signals'>>,
  submitted: SignalEntry[],
  submittedTimestamp: string
): SignalEntry[] => {
  const latest = new Map<string, { timestamp: string; signal: SignalEntry }>();

  const consider = (timestamp: string, signals: SignalEntry[] = []) => {
    for (const signal of signals) {
      if (signal.type !== 'detection') continue;
      const ruleId = signal.metadata?.rule_uuid;
      if (!ruleId) continue;
      const existing = latest.get(ruleId);
      if (existing === undefined || timestamp >= existing.timestamp) {
        latest.set(ruleId, { timestamp, signal });
      }
    }
  };

  priorDocs.forEach((doc) => consider(doc['@timestamp'], doc.signals ?? []));
  consider(submittedTimestamp, submitted);
  return [...latest.values()].map((entry) => entry.signal);
};

interface PreparedInput {
  index: number;
  input: DiscoveryWriteInput;
  isExplicitEventId: boolean;
  windowMs?: number;
  cutoffMs?: number;
  fingerprint?: string;
}

const prepareInputs = (inputs: DiscoveryWriteInput[], now: Date): PreparedInput[] => {
  assertValidBulkWriteSize(inputs);
  assertUniqueBulkWriteKeys(
    inputs.flatMap((input, index) =>
      input.event_id === undefined ? [] : [{ index, key: input.event_id }]
    ),
    'event_id'
  );

  const prepared = inputs.map((input, index) => {
    const isExplicitEventId = input.event_id !== undefined;
    const windowMs = input.dedup_window ? parseDateMathToMs(input.dedup_window, now) : undefined;
    const isDedupEligible =
      !isExplicitEventId && input.kind === 'discovery' && windowMs !== undefined;
    return {
      index,
      input,
      isExplicitEventId,
      windowMs,
      cutoffMs: isDedupEligible ? now.getTime() - windowMs : undefined,
      fingerprint: isDedupEligible
        ? makeFingerprint(input.stream_names, extractRuleUuids(input.signals))
        : undefined,
    };
  });

  assertUniqueBulkWriteKeys(
    prepared.flatMap(({ index, fingerprint }) =>
      fingerprint === undefined ? [] : [{ index, key: fingerprint }]
    ),
    'discovery fingerprint'
  );
  return prepared;
};

const findExistingDuplicate = (
  prepared: PreparedInput,
  recentDiscoveries: Discovery[]
): Discovery | undefined => {
  if (prepared.fingerprint === undefined || prepared.cutoffMs === undefined) {
    return undefined;
  }
  const { cutoffMs, fingerprint } = prepared;
  return recentDiscoveries.find(
    (discovery) =>
      discovery.kind === 'discovery' &&
      Date.parse(discovery['@timestamp']) >= cutoffMs &&
      makeFingerprint(discovery.stream_names ?? [], extractRuleUuids(discovery.signals)) ===
        fingerprint
  );
};

export async function discoveryWriteBulkHandler({
  discoveryClient,
  inputs,
}: {
  discoveryClient: DiscoveryClient;
  inputs: DiscoveryWriteInput[];
}): Promise<DiscoveryWriteBulkResult[]> {
  const now = new Date();
  const preparedInputs = prepareInputs(inputs, now);
  const eligibleWindows = preparedInputs.flatMap(({ windowMs, fingerprint }) =>
    windowMs === undefined || fingerprint === undefined ? [] : [windowMs]
  );
  const recentDiscoveries =
    eligibleWindows.length === 0
      ? []
      : (
          await discoveryClient.findLatest({
            from: new Date(now.getTime() - Math.max(...eligibleWindows)).toISOString(),
          })
        ).hits;

  const results: Array<DiscoveryWriteBulkResult | undefined> = new Array(inputs.length);
  const inputsToCreate: Array<PreparedInput & { eventId: string; discoveryId: string }> = [];

  for (const prepared of preparedInputs) {
    const duplicate = findExistingDuplicate(prepared, recentDiscoveries);
    if (duplicate) {
      const eventId =
        duplicate.event_id ??
        generateEventId(prepared.input.stream_names, extractRuleUuids(prepared.input.signals));
      results[prepared.index] = {
        index: prepared.index,
        discovery_id: duplicate.discovery_id,
        event_id: eventId,
        kind: prepared.input.kind,
        written: false,
        skipped: true,
        reason: 'duplicate_within_window',
        existing_discovery_id: duplicate.discovery_id,
      };
      continue;
    }

    inputsToCreate.push({
      ...prepared,
      eventId:
        prepared.input.event_id ??
        generateEventId(prepared.input.stream_names, extractRuleUuids(prepared.input.signals)),
      discoveryId: uuidv4(),
    });
  }

  const priorDocsByEventId = new Map<string, Discovery[]>();
  await Promise.all(
    inputsToCreate
      .filter(({ isExplicitEventId, input }) => isExplicitEventId && input.kind !== 'handled')
      .map(async ({ eventId }) => {
        const { hits } = await discoveryClient.findByEventId(eventId);
        priorDocsByEventId.set(
          eventId,
          hits.filter((doc) => doc.kind !== 'handled')
        );
      })
  );

  const timestamp = new Date().toISOString();
  const created = inputsToCreate.map((prepared) => {
    const { dedup_window: _dedupWindow, event_id: _eventId, ...rest } = prepared.input;
    const signals = prepared.isExplicitEventId
      ? mergeSignalsLatestPerRule(
          priorDocsByEventId.get(prepared.eventId) ?? [],
          prepared.input.signals ?? [],
          timestamp
        )
      : prepared.input.signals ?? [];
    return {
      ...prepared,
      document: {
        ...rest,
        '@timestamp': timestamp,
        discovered_at: prepared.input.kind === 'discovery' ? timestamp : undefined,
        event_id: prepared.eventId,
        discovery_id: prepared.discoveryId,
        signals,
        severity: prepared.input.severity,
      },
    };
  });

  if (created.length > 0) {
    let response;
    try {
      response = await discoveryClient.bulkCreate(
        created.map(({ document }) => document),
        { throwOnFail: false }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Elasticsearch transport error';
      throw createBulkWriteOutcomeUnknownError(
        `Discovery bulk write outcome is unknown: ${message}`
      );
    }

    if (response.items.length !== created.length || response.items.some((item) => !item.create)) {
      throw createBulkWriteOutcomeUnknownError(
        `Discovery bulk response did not align with the ${created.length} submitted documents`
      );
    }

    created.forEach(({ index, discoveryId, eventId, input }, responseIndex) => {
      const detail = response.items[responseIndex].create;
      if (detail === undefined) {
        throw createBulkWriteOutcomeUnknownError(
          `Discovery bulk response item ${responseIndex} did not contain a create result`
        );
      }
      results[index] = detail.error
        ? {
            index,
            discovery_id: discoveryId,
            event_id: eventId,
            kind: input.kind,
            written: false,
            reason: 'bulk_error',
            error: toCompactBulkError(detail),
          }
        : {
            index,
            discovery_id: discoveryId,
            event_id: eventId,
            kind: input.kind,
            written: true,
          };
    });
  }

  const alignedResults: DiscoveryWriteBulkResult[] = [];
  for (const result of results) {
    if (result === undefined) {
      throw createBulkWriteOutcomeUnknownError(
        'Discovery bulk results were not aligned with every input'
      );
    }
    alignedResults.push(result);
  }
  return alignedResults;
}

export async function discoveryWriteHandler({
  discoveryClient,
  input,
}: {
  discoveryClient: DiscoveryClient;
  input: DiscoveryWriteInput;
}): Promise<DiscoveryWriteResult> {
  const [result] = await discoveryWriteBulkHandler({ discoveryClient, inputs: [input] });
  if (result === undefined) {
    throw createBulkWriteOutcomeUnknownError('Discovery bulk write did not return a result');
  }
  if ('reason' in result && result.reason === 'bulk_error') {
    throw createBulkWriteItemError(result.error);
  }
  return result;
}
