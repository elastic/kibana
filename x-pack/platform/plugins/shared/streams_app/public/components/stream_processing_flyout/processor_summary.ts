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

const summarizeAddFields = (processor: DraftProcessor): string | undefined => {
  const fields = processor.config.find(({ name, telemetry }) => name === 'fields' && !telemetry);
  if (!fields || !Array.isArray(fields.value)) {
    return undefined;
  }
  return fields.value
    .flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }
      const base = item.location ?? item.context;
      const target = base
        ? `${formatValue(base)}.${formatValue(item.path)}`
        : formatValue(item.path);
      const value =
        item.ottl_value !== undefined
          ? ` = ${formatValue(item.ottl_value)}`
          : item.value !== undefined
          ? ` = ${JSON.stringify(item.value)}`
          : '';
      return [`${formatValue(item.action ?? 'upsert')} ${target}${value}`];
    })
    .join('; ');
};

const SUMMARIZERS: Record<string, (processor: DraftProcessor) => string | undefined> = {
  add_fields: summarizeAddFields,
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
