/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMap, parseDocument } from 'yaml';
import { ByteSizeSchema, CollisionStrategySchema, DurationSchema } from '@kbn/workflows';
import type { CollisionStrategy } from '@kbn/workflows';
import { detectIndent } from '@kbn/workflows-yaml';

/** What the form holds for the workflow settings it edits: text, as typed, so a half-typed value is not lost. */
export interface ExecutionSettingsDraft {
  readonly timeout: string;
  readonly maxStepSize: string;
  readonly concurrencyKey: string;
  readonly concurrencyStrategy: CollisionStrategy | '';
  readonly concurrencyMax: string;
  readonly queueSize: string;
  readonly queueTtl: string;
}

export type ExecutionSettingsField = keyof ExecutionSettingsDraft;

/** `null` removes the setting; a missing key leaves it as it is. */
export interface ExecutionSettingsPatch {
  readonly timeout?: string | null;
  readonly 'max-step-size'?: string | null;
  readonly concurrency?: Readonly<Record<string, unknown>> | null;
}

export const EMPTY_EXECUTION_SETTINGS: ExecutionSettingsDraft = {
  timeout: '',
  maxStepSize: '',
  concurrencyKey: '',
  concurrencyStrategy: '',
  concurrencyMax: '',
  queueSize: '',
  queueTtl: '',
};

const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** The form values for the `settings` of a workflow; anything it does not edit is ignored. */
export const readExecutionSettings = (settings: unknown): ExecutionSettingsDraft => {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    return EMPTY_EXECUTION_SETTINGS;
  }
  const record = settings as Record<string, unknown>;
  const concurrency =
    record.concurrency !== null &&
    typeof record.concurrency === 'object' &&
    !Array.isArray(record.concurrency)
      ? (record.concurrency as Record<string, unknown>)
      : {};
  const strategy = CollisionStrategySchema.safeParse(concurrency.strategy);
  return {
    timeout: asText(record.timeout),
    maxStepSize: asText(record['max-step-size']),
    concurrencyKey: asText(concurrency.key),
    concurrencyStrategy: strategy.success ? strategy.data : '',
    concurrencyMax: asText(concurrency.max),
    queueSize: asText(concurrency['queue-size']),
    queueTtl: asText(concurrency['queue-ttl']),
  };
};

const MAX_CONCURRENCY_KEY_LENGTH = 512;

const isPositiveInteger = (text: string): boolean => /^\d+$/.test(text) && Number(text) >= 1;

/** The fields whose text is not a valid value yet. An empty field is valid: it means "not set". */
export const invalidExecutionSettings = (
  draft: ExecutionSettingsDraft
): ReadonlySet<ExecutionSettingsField> => {
  const invalid = new Set<ExecutionSettingsField>();
  const timeout = draft.timeout.trim();
  if (timeout && !DurationSchema.safeParse(timeout).success) invalid.add('timeout');
  const maxStepSize = draft.maxStepSize.trim();
  if (maxStepSize && !ByteSizeSchema.safeParse(maxStepSize).success) invalid.add('maxStepSize');
  if (draft.concurrencyKey.length > MAX_CONCURRENCY_KEY_LENGTH) invalid.add('concurrencyKey');
  const max = draft.concurrencyMax.trim();
  if (max && !isPositiveInteger(max)) invalid.add('concurrencyMax');
  const queueSize = draft.queueSize.trim();
  if (queueSize && !isPositiveInteger(queueSize)) invalid.add('queueSize');
  const queueTtl = draft.queueTtl.trim();
  if (queueTtl && !DurationSchema.safeParse(queueTtl).success) invalid.add('queueTtl');
  return invalid;
};

/**
 * What to write for a draft. A setting whose text is not valid yet is left out, so the document keeps its
 * last valid value; an empty one removes the setting. The queue settings only apply to the `queue` strategy.
 */
export const executionSettingsPatch = (draft: ExecutionSettingsDraft): ExecutionSettingsPatch => {
  const invalid = invalidExecutionSettings(draft);
  const patch: { -readonly [K in keyof ExecutionSettingsPatch]: ExecutionSettingsPatch[K] } = {};
  if (!invalid.has('timeout')) patch.timeout = draft.timeout.trim() || null;
  if (!invalid.has('maxStepSize')) patch['max-step-size'] = draft.maxStepSize.trim() || null;

  const concurrencyInvalid = (
    ['concurrencyKey', 'concurrencyMax', 'queueSize', 'queueTtl'] as const
  ).some((field) => invalid.has(field));
  if (!concurrencyInvalid) {
    const concurrency: Record<string, unknown> = {};
    if (draft.concurrencyKey.trim()) concurrency.key = draft.concurrencyKey.trim();
    if (draft.concurrencyStrategy) concurrency.strategy = draft.concurrencyStrategy;
    if (draft.concurrencyMax.trim()) concurrency.max = Number(draft.concurrencyMax.trim());
    if (draft.concurrencyStrategy === 'queue') {
      if (draft.queueSize.trim()) concurrency['queue-size'] = Number(draft.queueSize.trim());
      if (draft.queueTtl.trim()) concurrency['queue-ttl'] = draft.queueTtl.trim();
    }
    patch.concurrency = Object.keys(concurrency).length > 0 ? concurrency : null;
  }
  return patch;
};

/**
 * Writes the patch into the `settings` of the YAML document. The settings the form does not edit
 * (`run_as`, `timezone`, `on-failure`, `liquid`) stay, and `settings` goes away once nothing is left in it.
 */
export const writeExecutionSettings = (
  yamlString: string,
  patch: ExecutionSettingsPatch
): string => {
  try {
    const doc = parseDocument(yamlString);
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return yamlString;

    for (const [key, value] of entries) {
      if (value === null) {
        doc.deleteIn(['settings', key]);
      } else {
        doc.setIn(['settings', key], doc.createNode(value));
      }
    }
    const settings = doc.get('settings', true);
    if (isMap(settings) && settings.items.length === 0) doc.delete('settings');
    return doc.toString({ indent: detectIndent(yamlString), lineWidth: 0 });
  } catch {
    return yamlString;
  }
};
