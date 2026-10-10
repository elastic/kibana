/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser } from '@elastic/esql';
import {
  appendToESQLQuery,
  convertTimeseriesCommandToFrom,
  extractCategorizeTokens,
  sanitazeESQLInput,
} from '@kbn/esql-utils';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import { QUERY_MODE } from '@kbn/aiops-log-pattern-analysis/get_category_query';

/** Commands that truncate the document set, or project columns away (the analysis needs the time and analysed fields). */
const COMMANDS_TO_DROP_FOR_ANALYSIS = new Set(['limit', 'sort', 'sample', 'keep', 'drop']);

/** Commands after which rows are no longer documents, so nothing from here on can scope them. */
const COMMANDS_THAT_END_DOCUMENT_SCOPE = new Set(['stats']);

/**
 * Returns the document-producing prefix of an ES|QL query for reverse categorization analysis.
 */
export function getEsqlDocumentScopeQuery(esql: string): string {
  const converted = convertTimeseriesCommandToFrom(esql);
  const { root, errors } = Parser.parse(converted);
  if (errors.length > 0 || root.commands.length === 0) {
    return converted.trim();
  }

  const endIndex = root.commands.findIndex((command) =>
    COMMANDS_THAT_END_DOCUMENT_SCOPE.has(command.name)
  );
  const scopedCommands = (endIndex < 0 ? root.commands : root.commands.slice(0, endIndex)).filter(
    (command) => !COMMANDS_TO_DROP_FOR_ANALYSIS.has(command.name)
  );

  if (scopedCommands.length === 0) {
    return converted.trim();
  }

  return BasicPrettyPrinter.print({ ...root, commands: scopedCommands }).trim();
}

/**
 * Aligns the sparkline range to multiples of the interval, matching the bucket keys of a
 * date_histogram (which rounds down to the interval since the epoch).
 */
export function getAlignedSparklineRange({
  earliest,
  latest,
  intervalMs,
}: {
  earliest: number;
  latest: number;
  intervalMs: number;
}): { start: number; end: number; bucketCount: number } {
  const start = Math.floor(earliest / intervalMs) * intervalMs;
  const bucketCount = Math.max(1, Math.ceil((latest - start) / intervalMs));
  return { start, end: start + bucketCount * intervalMs, bucketCount };
}

/**
 * Builds an ES|QL CATEGORIZE query that preserves Discover's active document filters.
 */
export function buildEsqlCategorizeQuery({
  esql,
  fieldName,
  timeFieldName,
  bucketCount,
  rangeStart,
  rangeEnd,
}: {
  esql: string;
  fieldName: string;
  timeFieldName: string;
  bucketCount: number;
  rangeStart: number;
  rangeEnd: number;
}): string {
  const scopeQuery = getEsqlDocumentScopeQuery(esql);
  const field = sanitazeESQLInput(fieldName);
  const timeField = sanitazeESQLInput(timeFieldName);
  const buckets = Math.max(1, Math.floor(bucketCount));

  return appendToESQLQuery(
    scopeQuery,
    `| STATS Count = COUNT(*), Sparkline = SPARKLINE(COUNT(*), ${timeField}, ${buckets}, TO_DATETIME("${new Date(
      rangeStart
    ).toISOString()}"), TO_DATETIME("${new Date(
      rangeEnd
    ).toISOString()}")) BY Pattern = CATEGORIZE(${field})
| SORT Count DESC`
  );
}

/**
 * Builds MATCH filter expression used for category include/exclude in ES|QL.
 */
export function buildMatchFilterExpression(
  fieldName: string,
  value: string,
  mode: QueryMode = QUERY_MODE.INCLUDE
): string {
  const field = sanitazeESQLInput(fieldName);
  const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const notPrefix = mode === QUERY_MODE.INCLUDE ? '' : 'NOT ';

  return `${notPrefix}MATCH(${field}, "${escapedValue}", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})`;
}

/** Commands that truncate, aggregate or project rows; a filter on documents must come before them. */
const COMMANDS_TO_FILTER_BEFORE = new Set(['limit', 'sample', 'stats', 'keep', 'drop']);

/**
 * Adds a filter as its own WHERE command, placed before any LIMIT / SAMPLE / STATS / KEEP / DROP
 * so it applies to documents rather than to the truncated or aggregated rows. A separate WHERE is
 * ANDed with existing ones, so OR conditions in the query keep their precedence.
 */
export function addWhereToEsqlQuery(esql: string, expression: string): string {
  const { root, errors } = Parser.parse(esql);
  const insertIndex = root.commands.findIndex((command) =>
    COMMANDS_TO_FILTER_BEFORE.has(command.name)
  );

  if (errors.length > 0 || insertIndex < 0) {
    return appendToESQLQuery(esql, `| WHERE ${expression}`);
  }

  const before = BasicPrettyPrinter.print({
    ...root,
    commands: root.commands.slice(0, insertIndex),
  });
  const after = root.commands
    .slice(insertIndex)
    .map((command) => BasicPrettyPrinter.print(command))
    .join('\n| ');

  return `${before.trim()}\n| WHERE ${expression}\n| ${after}`;
}

/**
 * Builds an ES|QL docs query for documents matching a categorize pattern within the Discover scope.
 */
export function buildEsqlCategoryDocsQuery({
  esql,
  fieldName,
  timeFieldName,
  categoryKey,
  size = 1000,
}: {
  esql: string;
  fieldName: string;
  timeFieldName: string;
  categoryKey: string;
  size?: number;
}): string {
  const scopeQuery = getEsqlDocumentScopeQuery(esql);
  const matchExpression = buildMatchFilterExpression(fieldName, categoryKey, QUERY_MODE.INCLUDE);
  const field = sanitazeESQLInput(fieldName);
  const timeField = sanitazeESQLInput(timeFieldName);

  // A separate WHERE is ANDed with the existing ones, so OR / NOT in the scope keep their precedence.
  const withMatch = appendToESQLQuery(scopeQuery, `| WHERE ${matchExpression}`);

  return appendToESQLQuery(
    withMatch,
    `| KEEP ${field}, ${timeField}
| LIMIT ${size}`
  );
}

/**
 * Maps a CATEGORIZE Pattern regex to Category.key tokens used by MATCH filters.
 */
export function categoryKeyFromPattern(pattern: string): string {
  return extractCategorizeTokens(pattern).join(' ');
}

/**
 * Converts an ES|QL SPARKLINE array into the Record keyed by bucket start used by MiniHistogram.
 */
export function mapEsqlSparklineToBuckets({
  values,
  earliest,
  intervalMs,
}: {
  values: unknown;
  earliest: number;
  intervalMs: number;
}): Record<number, number> {
  if (!Array.isArray(values) || values.length === 0 || intervalMs <= 0) {
    return {};
  }

  return values.reduce<Record<number, number>>((acc, value, index) => {
    const count = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(count)) {
      return acc;
    }
    acc[earliest + index * intervalMs] = count;
    return acc;
  }, {});
}

/**
 * Finds the categorize pattern that matches a document field value.
 */
export function findCategoryMatchingFieldValue(
  categories: Category[],
  fieldValue: string
): Category | undefined {
  return categories.find((category) => {
    if (!category.regex) {
      return false;
    }
    try {
      return new RegExp(category.regex).test(fieldValue);
    } catch {
      return false;
    }
  });
}
