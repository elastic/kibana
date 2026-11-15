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

/**
 * One line per write of a field-writing processor: `add_fields` names fields in a keyed
 * location, `set` addresses them by path, optionally under a context or a location.
 */
const summarizeWrites =
  (entryName: string) =>
  (processor: DraftProcessor): string | undefined => {
    const entry = unscopedEntry(processor, entryName);
    if (!entry || !Array.isArray(entry.value)) {
      return undefined;
    }
    const writes = entry.value
      .flatMap((item) => {
        if (!isRecord(item)) {
          return [];
        }
        const base = item.location ?? item.context;
        const field = formatValue(item.name ?? item.path);
        const target = base ? `${formatValue(base)}.${field}` : field;
        const value =
          item.ottl_value !== undefined
            ? ` = ${formatValue(item.ottl_value)}`
            : item.value !== undefined
            ? ` = ${JSON.stringify(item.value)}`
            : '';
        return [`${formatValue(item.action ?? 'upsert')} ${target}${value}`];
      })
      .join('; ');
    const condition = unscopedEntry(processor, 'condition')?.value;
    return typeof condition === 'string' && condition.length > 0
      ? `${writes} if ${condition}`
      : writes;
  };

const SUMMARIZERS: Record<string, (processor: DraftProcessor) => string | undefined> = {
  add_fields: summarizeWrites('fields'),
  set: summarizeWrites('operations'),
};

/** One-line description of a processor's configuration for its card. */
export const summarizeProcessor = (processor: DraftProcessor): string => {
  const specific = SUMMARIZERS[processor.type]?.(processor);
  if (specific) {
    return truncate(specific);
  }
  return truncate(
    processor.config.map(({ name, value }) => `${name}: ${formatValue(value)}`).join(', ')
  );
};
