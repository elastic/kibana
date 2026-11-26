/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DraftProcessor } from '../../services/unit_processing';

const MAX_SUMMARY_LENGTH = 160;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

const truncate = (text: string): string =>
  text.length > MAX_SUMMARY_LENGTH ? `${text.slice(0, MAX_SUMMARY_LENGTH - 1)}…` : text;

const unscopedEntry = (processor: DraftProcessor, entryName: string) =>
  processor.config.find(({ name, telemetry }) => name === entryName && !telemetry);

type Summarizer = (processor: DraftProcessor) => string | undefined;

/** The filled-in strings of a list, such as the conditions of a filter block. */
const textsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];

const withCondition = (summary: string, conditions: readonly string[]): string =>
  conditions.length > 0 ? `${summary} if ${conditions.join(' or ')}` : summary;

/** A field as `<location>.<name>`, or whichever of the two is filled in. */
const fieldOf = (location: unknown, name: unknown): string =>
  [location, name]
    .filter((part) => part !== undefined && part !== '')
    .map(formatValue)
    .join('.');

/**
 * One part per item of the processor's list, then the processor's condition. An item the
 * summary has nothing to say about is left out.
 */
const summarizeItems =
  (
    entryName: string,
    describe: (item: Record<string, unknown>) => string | undefined
  ): Summarizer =>
  (processor) => {
    const entry = unscopedEntry(processor, entryName);
    if (!entry || !Array.isArray(entry.value)) {
      return undefined;
    }
    const parts = entry.value.flatMap((item) => {
      const part = isRecord(item) ? describe(item) : undefined;
      return part ? [part] : [];
    });
    if (parts.length === 0) {
      return undefined;
    }
    const condition = unscopedEntry(processor, 'condition')?.value;
    return withCondition(parts.join('; '), textsOf([condition]));
  };

/**
 * `add_fields` names fields in a keyed location, `set` addresses them by path, optionally under
 * a context or a location.
 */
const describeWrite = (item: Record<string, unknown>): string => {
  const target = fieldOf(item.location ?? item.context, item.name ?? item.path);
  const value =
    item.ottl_value !== undefined
      ? ` = ${formatValue(item.ottl_value)}`
      : item.value !== undefined
      ? ` = ${JSON.stringify(item.value)}`
      : '';
  return `${formatValue(item.action ?? 'upsert')} ${target}${value}`;
};

/** A rename stays in its location; a move can end in another one. */
const describeRelocation =
  (verb: string) =>
  (item: Record<string, unknown>): string =>
    `${verb} ${fieldOf(item.location, item.name)} → ${fieldOf(
      item.new_location ?? item.location,
      item.new_name
    )}`;

const describeDeletion = (item: Record<string, unknown>): string | undefined => {
  const names = textsOf(item.names);
  return names.length > 0
    ? `delete ${names.map((name) => fieldOf(item.location, name)).join(', ')}`
    : undefined;
};

/** Data that matches any condition of a filter block is dropped. */
const describeFilterBlock = (item: Record<string, unknown>): string | undefined => {
  const conditions = textsOf(item.conditions);
  return conditions.length > 0 ? withCondition('drop', conditions) : undefined;
};

/** The statements of a transform block run when any of its conditions holds. */
const describeTransformBlock = (item: Record<string, unknown>): string | undefined => {
  const statements = textsOf(item.statements);
  return statements.length > 0
    ? withCondition(statements.join('; '), textsOf(item.conditions))
    : undefined;
};

const SUMMARIZERS: Record<string, Summarizer> = {
  add_fields: summarizeItems('fields', describeWrite),
  delete_fields: summarizeItems('fields', describeDeletion),
  filter: summarizeItems('conditions', describeFilterBlock),
  move_fields: summarizeItems('fields', describeRelocation('move')),
  rename_fields: summarizeItems('fields', describeRelocation('rename')),
  set: summarizeItems('operations', describeWrite),
  transform: summarizeItems('statements', describeTransformBlock),
};

/** Description of a processor's whole configuration, however long it is. */
export const describeProcessor = (processor: DraftProcessor): string =>
  SUMMARIZERS[processor.type]?.(processor) ??
  processor.config.map(({ name, value }) => `${name}: ${formatValue(value)}`).join(', ');

/** One-line description of a processor's configuration for its card. */
export const summarizeProcessor = (processor: DraftProcessor): string =>
  truncate(describeProcessor(processor));
