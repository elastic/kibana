/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import type { DocumentAnalysis, FormattedDocumentAnalysis } from './document_analysis';
import { selectFields } from './select_fields';

const VALUE_LENGTH_LIMIT = 1024;
const TEXT_TYPES = new Set(['text', 'match_only_text']);

const HIDE_VALUES_FOR = ['@timestamp', 'timestamp', 'event.ingested', 'event.created'];

const NO_VALUE_LABEL = '(no value)';

/** A source-wide union-type conflict for a field, as detected by `getMappingConflicts`. */
export interface FieldConflict {
  types: string[];
  /** ES's `suggested_cast` for resolving the union, if any. */
  suggestedCast?: string;
}

interface FormatDocumentAnalysisOptions {
  dropEmpty?: boolean;
  dropUnmapped?: boolean;
  limit?: number;
  /**
   * Source-wide union conflicts keyed by field name. Only fields that survive
   * truncation get annotated, so the noise of source-wide-but-irrelevant
   * conflicts never reaches the output.
   */
  conflicts?: Record<string, FieldConflict>;
}

export function formatDocumentAnalysis(
  analysis: DocumentAnalysis,
  options?: FormatDocumentAnalysisOptions
): FormattedDocumentAnalysis {
  const { dropEmpty = false, dropUnmapped = false, limit = 500, conflicts } = options ?? {};

  const fields = selectFields(analysis, { dropEmpty, dropUnmapped, limit });

  const formatted = {
    total: analysis.total,
    sampled: analysis.sampled,
    fields: Object.fromEntries(
      fields.map((field) => {
        return [
          getFieldKey(field, conflicts?.[field.name]),
          formatFieldSummary(field, analysis.sampled),
        ];
      })
    ),
  };

  return formatted;
}

function getFieldKey(field: DocumentAnalysis['fields'][number], conflict?: FieldConflict): string {
  if (conflict) {
    const types = conflict.types.join(', ');
    // No `suggestedCast` means ES could not resolve the union (unsupported member);
    // asserting `keyword` here would suggest a cast that itself fails.
    return conflict.suggestedCast
      ? `${field.name} (${types} - recommended: ${conflict.suggestedCast})`
      : `${field.name} (${types} - ambiguous, no safe cast)`;
  }

  if (!field.types.length) {
    return `${field.name} (unmapped - no type)`;
  }

  return `${field.name} (${field.types.join(', ')})`;
}

function formatFieldSummary(field: DocumentAnalysis['fields'][number], sampled: number): string[] {
  const values = orderBy(field.values, (value) => value.count, 'desc');

  const displayableValues = values.map(({ value, count }) =>
    String(value).length <= VALUE_LENGTH_LIMIT
      ? { value, count }
      : { value: String(value).slice(0, VALUE_LENGTH_LIMIT) + '...', count }
  );

  const areValuesHidden = HIDE_VALUES_FOR.includes(field.name);

  const isTextField = field.types.some((type) => TEXT_TYPES.has(type));

  const maxValueCount = areValuesHidden ? 0 : isTextField ? 2 : 5;

  const valuesToDisplay = displayableValues.slice(0, maxValueCount);

  const remainingValueCount = Math.max(values.length - valuesToDisplay.length, 0);

  const documentsWithValue = field.documentsWithValue;

  const documentsWithoutValue = Math.max(sampled - documentsWithValue, 0);

  const valueSummaries: string[] = valuesToDisplay.map((entry) => {
    return formatValueDistribution(entry.value, entry.count, sampled);
  });

  if (remainingValueCount > 0) {
    valueSummaries.push(`... (+${remainingValueCount} more)`);
  }

  if (documentsWithoutValue > 0) {
    valueSummaries.push(formatValueDistribution(NO_VALUE_LABEL, documentsWithoutValue, sampled));
  }

  return valueSummaries;
}

function formatValueDistribution(
  value: string | number | boolean,
  count: number,
  sampled: number
): string {
  const percentage = sampled > 0 ? Math.round((count / sampled) * 100) : 0;
  const label = typeof value === 'string' ? value : String(value);

  return `${label} (${percentage}%)`;
}
