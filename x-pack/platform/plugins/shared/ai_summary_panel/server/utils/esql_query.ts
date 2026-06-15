/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import dateMath from '@kbn/datemath';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

const TIMESTAMP_CANDIDATES = ['@timestamp', 'timestamp', 'time', 'date', 'event.created'];
const DATE_KEYWORDS = ['date', 'time', 'created', 'updated', 'modified', 'timestamp'];

export function injectTimeFilter(query: string, timeField: string): string {
  const clause = `| WHERE \`${timeField}\` >= ?_tstart AND \`${timeField}\` < ?_tend `;
  const pipeIdx = query.indexOf('|');
  return pipeIdx === -1
    ? `${query.trimEnd()} ${clause}`
    : `${query.slice(0, pipeIdx)}${clause}${query.slice(pipeIdx)}`;
}

// Known prefixes that indicate a non-event date (person/entity attribute, not an event timestamp).
// These should be skipped in favour of fields like order_date, event_time, etc.
const NON_EVENT_DATE_PREFIXES = ['birth', 'expir', 'death', 'dob', 'hired', 'fired', 'retire'];

function scoreDateField(field: string): number {
  const lower = field.toLowerCase();
  // Strong positive: standalone "date" / "timestamp"
  if (lower === 'date' || lower === 'timestamp') return 100;
  // Penalise personal/attribute dates
  if (NON_EVENT_DATE_PREFIXES.some((p) => lower.includes(p))) return -10;
  // Prefer fields where "date" or "time" is a suffix with fewer qualifiers before it
  const parts = lower.split('_');
  const lastPart = parts[parts.length - 1];
  if (lastPart === 'date' || lastPart === 'time' || lastPart === 'timestamp') {
    // Fewer parts = less qualified = more likely the primary event timestamp
    return Math.max(1, 20 - parts.length * 4);
  }
  // Contains a date keyword somewhere else
  return 1;
}

function pickDateFieldHeuristic(fields: string[]): string {
  const nonNested = fields.filter((f) => !f.includes('.'));
  const pool = nonNested.length > 0 ? nonNested : fields;
  const sorted = pool
    .map((f) => ({ f, score: scoreDateField(f) }))
    .sort((a, b) => b.score - a.score || a.f.localeCompare(b.f));
  return sorted[0].f;
}

function detectTimeFieldFromQuery(esqlQuery: string): string | null {
  const sortMatch = esqlQuery.match(/\|\s*SORT\s+`?([\w.@]+)`?/i);
  const sortField = sortMatch?.[1]?.trim();
  if (!sortField) return null;
  if (TIMESTAMP_CANDIDATES.includes(sortField)) return sortField;
  for (const kw of DATE_KEYWORDS) {
    if (sortField.toLowerCase().includes(kw)) return sortField;
  }
  return null;
}

export interface EsqlColumn {
  name: string;
  type: string;
}

export interface EsqlQueryResult {
  columns: EsqlColumn[];
  rows: unknown[][];
}

export async function runEsqlQuery(
  esClient: ElasticsearchClient,
  esqlQuery: string,
  timeRange: { from: string; to: string } | null | undefined
): Promise<EsqlQueryResult> {
  const queryAlreadyHasTimeParams = esqlQuery.includes('?_tstart') || esqlQuery.includes('?_tend');

  let detectedTimeField: string | null = null;
  let esqlParams: Array<Record<string, string>> | undefined;

  if (timeRange && !queryAlreadyHasTimeParams) {
    detectedTimeField = detectTimeFieldFromQuery(esqlQuery);
    if (!detectedTimeField) {
      const indexPattern = getIndexPatternFromESQLQuery(esqlQuery) || null;
      if (indexPattern) {
        try {
          const candidateCaps = await esClient.fieldCaps({
            index: indexPattern,
            fields: TIMESTAMP_CANDIDATES,
          });
          for (const field of TIMESTAMP_CANDIDATES) {
            const fieldTypes = candidateCaps.fields[field];
            if (fieldTypes && ('date' in fieldTypes || 'date_nanos' in fieldTypes)) {
              detectedTimeField = field;
              break;
            }
          }
          if (!detectedTimeField) {
            const allCaps = await esClient.fieldCaps({ index: indexPattern, fields: ['*'] });
            const dateFields = Object.entries(allCaps.fields)
              .filter(([, types]) => 'date' in types || 'date_nanos' in types)
              .map(([name]) => name);
            if (dateFields.length > 0) detectedTimeField = pickDateFieldHeuristic(dateFields);
          }
        } catch {
          /* non-fatal — skip time injection */
        }
      }
    }
  }

  const effectiveQuery = detectedTimeField
    ? injectTimeFilter(esqlQuery, detectedTimeField)
    : esqlQuery;

  if (timeRange && (queryAlreadyHasTimeParams || detectedTimeField)) {
    esqlParams = [
      { _tstart: dateMath.parse(timeRange.from)?.toISOString() ?? timeRange.from },
      { _tend: dateMath.parse(timeRange.to, { roundUp: true })?.toISOString() ?? timeRange.to },
    ];
  }

  const result = await esClient.esql.query(
    {
      query: effectiveQuery,
      ...(esqlParams ? { params: esqlParams } : {}),
    },
    { requestTimeout: 30_000 }
  );

  return {
    columns: result.columns as EsqlColumn[],
    rows: result.values as unknown[][],
  };
}
