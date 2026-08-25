/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { extractEsqlFromSpec } from '@kbn/agent-builder-visualizations-server';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { EsqlResponse } from '@kbn/agent-builder-genai-utils/tools/utils/esql';

/** Maximum rows included in the sample sent to the judge. */
const MAX_SAMPLE_ROWS = 20;

/** Maximum characters of a custom_content template included in the judge payload. */
const CUSTOM_CONTENT_TEMPLATE_MAX_CHARS = 500;

export interface NumericColumnFacts {
  name: string;
  type: string;
  min: number | null;
  max: number | null;
  all_zero: boolean;
  null_share: number;
}

export interface KeywordColumnFacts {
  name: string;
  type: string;
  /** Distinct count within the sample. */
  distinct_count: number;
  top_values: Array<string | number | boolean | null>;
}

export interface PanelFacts {
  panel_id: string;
  title: string | undefined;
  grid: AttachmentPanel['grid'];
  /** Embeddable type (e.g. "lens", "vega", "custom_content", "markdown"). */
  panel_type: string;
  /** Full chart config — custom_content templates are truncated. */
  config: Record<string, unknown>;
  /** ES|QL query backing the panel, when present. */
  query?: string;
  execution_status: 'ok' | 'error' | 'no_query';
  error?: string;
  duration_ms?: number;
  row_count?: number;
  /** Whether sample_rows holds fewer rows than the query returned. */
  sample_truncated?: boolean;
  numeric_columns?: NumericColumnFacts[];
  keyword_columns?: KeywordColumnFacts[];
  /** First up to MAX_SAMPLE_ROWS rows verbatim. */
  sample_rows?: FieldValue[][];
}

/**
 * Extract the ES|QL queries backing a Lens config. Mirrors the logic used in
 * `dataset_probe.ts` via `getEsqlDataSourceCarriers`, but operates on the raw
 * config record without the full carrier machinery.
 */
const extractLensEsqlQuery = (config: Record<string, unknown>): string | undefined => {
  const ds = config.data_source as { type?: string; query?: string } | undefined;
  if (ds?.type === 'esql' && ds.query) {
    return ds.query;
  }
  const layers = config.layers as Array<{ data_source?: { type?: string; query?: string } }>;
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      if (layer.data_source?.type === 'esql' && layer.data_source.query) {
        return layer.data_source.query;
      }
    }
  }
  return undefined;
};

const extractVegaEsqlQuery = (config: Record<string, unknown>): string | undefined => {
  const queryFromSpec =
    typeof config.spec === 'string' ? extractEsqlFromSpec(config.spec) : undefined;
  if (queryFromSpec) {
    return queryFromSpec;
  }

  // Keep compatibility with older or externally-authored configs that stored
  // the query beside the spec instead of inside its data source.
  const esqlQuery = config.esqlQuery as string | undefined;
  return typeof esqlQuery === 'string' ? esqlQuery : undefined;
};

const extractCustomContentEsqlQuery = (config: Record<string, unknown>): string | undefined => {
  const esqlQuery = config.esqlQuery as string | undefined;
  return typeof esqlQuery === 'string' ? esqlQuery : undefined;
};

/** Return the primary ES|QL query for a panel, or undefined if none. */
export const extractPanelQuery = (panel: AttachmentPanel): string | undefined => {
  if (panel.type === LENS_EMBEDDABLE_TYPE) {
    return extractLensEsqlQuery(panel.config);
  }
  if (panel.type === VEGA_VIS_TYPE) {
    return extractVegaEsqlQuery(panel.config);
  }
  if (panel.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE) {
    return extractCustomContentEsqlQuery(panel.config);
  }
  return undefined;
};

/**
 * Sanitize a panel's config for the judge payload. Custom content templates
 * are truncated to avoid filling the context with generated HTML; all other
 * config types are passed through in full.
 */
const sanitizeConfig = (panel: AttachmentPanel): Record<string, unknown> => {
  if (panel.type !== CUSTOM_CONTENT_EMBEDDABLE_TYPE) {
    return panel.config;
  }
  const template = panel.config.template;
  if (typeof template !== 'string' || template.length <= CUSTOM_CONTENT_TEMPLATE_MAX_CHARS) {
    return panel.config;
  }
  return {
    ...panel.config,
    template: `${template.slice(0, CUSTOM_CONTENT_TEMPLATE_MAX_CHARS)}… [truncated]`,
  };
};

const computeNumericFacts = (
  col: EsqlEsqlColumnInfo,
  colIdx: number,
  values: FieldValue[][]
): NumericColumnFacts => {
  let min: number | null = null;
  let max: number | null = null;
  let nullCount = 0;
  let allZero = true;

  for (const row of values) {
    const v = row[colIdx];
    if (v === null || v === undefined) {
      nullCount++;
      continue;
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      nullCount++;
      continue;
    }
    if (n !== 0) allZero = false;
    if (min === null || n < min) min = n;
    if (max === null || n > max) max = n;
  }

  return {
    name: col.name,
    type: col.type,
    min,
    max,
    all_zero: allZero,
    null_share: values.length > 0 ? nullCount / values.length : 0,
  };
};

const computeKeywordFacts = (
  col: EsqlEsqlColumnInfo,
  colIdx: number,
  values: FieldValue[][]
): KeywordColumnFacts => {
  const seen = new Map<string, number>();
  const topValues: Array<string | number | boolean | null> = [];

  for (const row of values) {
    const v = row[colIdx];
    const key = String(v);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const sorted = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [key] of sorted) {
    topValues.push(key === 'null' || key === 'undefined' ? null : key);
  }

  return {
    name: col.name,
    type: col.type,
    distinct_count: seen.size,
    top_values: topValues,
  };
};

const NUMERIC_TYPES = new Set([
  'integer',
  'long',
  'double',
  'float',
  'short',
  'byte',
  'half_float',
  'scaled_float',
  'unsigned_long',
]);

/**
 * Compute judge-ready fact block from a successful ES|QL execution result.
 */
const computeResultFacts = (
  result: EsqlResponse,
  durationMs: number
): Pick<
  PanelFacts,
  | 'row_count'
  | 'sample_truncated'
  | 'numeric_columns'
  | 'keyword_columns'
  | 'sample_rows'
  | 'duration_ms'
> => {
  const { columns, values } = result;
  const numericColumns: NumericColumnFacts[] = [];
  const keywordColumns: KeywordColumnFacts[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (NUMERIC_TYPES.has(col.type)) {
      numericColumns.push(computeNumericFacts(col, i, values));
    } else {
      keywordColumns.push(computeKeywordFacts(col, i, values));
    }
  }

  return {
    row_count: values.length,
    sample_truncated: values.length > MAX_SAMPLE_ROWS,
    numeric_columns: numericColumns.length > 0 ? numericColumns : undefined,
    keyword_columns: keywordColumns.length > 0 ? keywordColumns : undefined,
    sample_rows: values.slice(0, MAX_SAMPLE_ROWS),
    duration_ms: durationMs,
  };
};

/**
 * Build a `PanelFacts` block for a panel that has no backing ES|QL query
 * (markdown, custom content without `esqlQuery`, other embeddables).
 */
export const buildNoQueryPanelFacts = (
  panel: AttachmentPanel,
  title: string | undefined
): PanelFacts => ({
  panel_id: panel.id,
  title,
  grid: panel.grid,
  panel_type: panel.type,
  config: sanitizeConfig(panel),
  execution_status: 'no_query',
});

/**
 * Build a `PanelFacts` block for a panel whose query execution failed.
 */
export const buildErrorPanelFacts = (
  panel: AttachmentPanel,
  title: string | undefined,
  query: string,
  error: string,
  durationMs?: number
): PanelFacts => ({
  panel_id: panel.id,
  title,
  grid: panel.grid,
  panel_type: panel.type,
  config: sanitizeConfig(panel),
  query,
  execution_status: 'error',
  error,
  duration_ms: durationMs,
});

/**
 * Build a `PanelFacts` block for a panel whose query executed successfully.
 */
export const buildSuccessPanelFacts = (
  panel: AttachmentPanel,
  title: string | undefined,
  query: string,
  result: EsqlResponse,
  durationMs: number
): PanelFacts => ({
  panel_id: panel.id,
  title,
  grid: panel.grid,
  panel_type: panel.type,
  config: sanitizeConfig(panel),
  query,
  execution_status: 'ok',
  ...computeResultFacts(result, durationMs),
});
