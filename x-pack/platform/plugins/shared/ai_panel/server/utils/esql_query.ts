/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import dateMath from '@kbn/datemath';
import { getTimeFieldFromESQLQuery } from '@kbn/esql-utils';

const MAX_SANITIZED_CELL_LENGTH = 500;

// Strips characters that could let a crafted field name/value break out of the sample
// table and inject instructions or Liquid syntax into the LLM prompt.
const HTML_ANGLE_BRACKETS = /[<>]/g;
const LINE_BREAKS = /[\r\n]+/g;
const LIQUID_OUTPUT_DELIMITER = /\{\{/g; // e.g. {{ row.field }}
const LIQUID_TAG_DELIMITER = /\{%/g; // e.g. {% for row in rows %}

/**
 * Sanitizes a single ES|QL cell value (or column name) before it is embedded in an LLM prompt.
 */
export function sanitizeCellValue(v: unknown): string {
  const withoutHtmlAndLineBreaks = String(v ?? '')
    .replace(HTML_ANGLE_BRACKETS, '')
    .replace(LINE_BREAKS, ' ');

  const withoutLiquidSyntax = withoutHtmlAndLineBreaks
    .replace(LIQUID_OUTPUT_DELIMITER, '{ {')
    .replace(LIQUID_TAG_DELIMITER, '{ %');

  return withoutLiquidSyntax.slice(0, MAX_SANITIZED_CELL_LENGTH);
}

export interface EsqlColumn {
  name: string;
  type: string;
}

interface EsqlQueryResult {
  columns: EsqlColumn[];
  rows: unknown[][];
}

/**
 * Runs an ES|QL query server-side (used by the generate route for schema sampling).
 * Resolves `?_tstart` / `?_tend` named params when the query contains them and a
 * `timeRange` is provided.
 */
export async function runEsqlQuery(
  esClient: ElasticsearchClient,
  esqlQuery: string,
  timeRange?: { from: string; to: string } | null
): Promise<EsqlQueryResult> {
  const hasTimeParams = getTimeFieldFromESQLQuery(esqlQuery) !== undefined;

  const esqlParams =
    hasTimeParams && timeRange
      ? [
          { _tstart: dateMath.parse(timeRange.from)?.toISOString() ?? timeRange.from },
          { _tend: dateMath.parse(timeRange.to, { roundUp: true })?.toISOString() ?? timeRange.to },
        ]
      : undefined;

  // Shorter than the Kibana default (30s) — this is a best-effort schema/sample-row lookup for
  // the LLM prompt, not the real data path, so a slow query should fail fast into the caller's
  // non-fatal fallback rather than delay panel generation.
  const result = await esClient.esql.query(
    {
      query: esqlQuery,
      ...(esqlParams ? { params: esqlParams } : {}),
    },
    { requestTimeout: '10s' }
  );

  return {
    columns: result.columns as EsqlColumn[],
    rows: result.values as unknown[][],
  };
}
