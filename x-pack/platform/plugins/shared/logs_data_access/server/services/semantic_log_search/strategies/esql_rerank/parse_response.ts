/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLRow, ESQLSearchResponse } from '@kbn/es-types';
import type { LogPattern } from '../../../../../common/services/semantic_log_search/types';
import { MAX_SAMPLE_LENGTH } from '../../constants';
import { CATEGORIZE_COLUMNS, MESSAGE_FIELD } from './columns';

// ES|QL responds columnar: resolve name → position once so rows can be read by column name.
// Returns undefined for columns the response does not carry; the caller skips the row.
function createCellReader(response: ESQLSearchResponse) {
  const positions = new Map((response.columns ?? []).map(({ name }, i) => [name, i]));
  return (row: ESQLRow, column: string): unknown => {
    const position = positions.get(column);
    return position === undefined ? undefined : row[position];
  };
}

// Wire values are unknown; an unusable timestamp returns undefined so the caller skips the row
// rather than throwing RangeError from new Date().toISOString().
function toIsoString(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Parse an ES|QL CATEGORIZE response into LogPattern objects, skipping malformed rows. */
export function parseEsqlPatternResponse(
  response: ESQLSearchResponse,
  field: string = MESSAGE_FIELD
): LogPattern[] {
  const cell = createCellReader(response);

  return (response.values ?? []).flatMap((row) => {
    const pattern = cell(row, CATEGORIZE_COLUMNS.pattern);
    const count = cell(row, CATEGORIZE_COLUMNS.count);
    if (pattern == null || count == null) return [];

    const firstSeen = toIsoString(cell(row, CATEGORIZE_COLUMNS.firstSeen));
    const lastSeen = toIsoString(cell(row, CATEGORIZE_COLUMNS.lastSeen));
    if (firstSeen === undefined || lastSeen === undefined) return [];

    const sampleMessage = cell(row, CATEGORIZE_COLUMNS.sample);
    const score = cell(row, CATEGORIZE_COLUMNS.score);
    const sample = sampleMessage ? String(sampleMessage).slice(0, MAX_SAMPLE_LENGTH) : '';

    return [
      {
        field,
        pattern: String(pattern),
        count: Number(count),
        firstSeen,
        lastSeen,
        sample: { [MESSAGE_FIELD]: sample },
        ...(typeof score === 'number' ? { relevanceScore: score } : {}),
      },
    ];
  });
}
