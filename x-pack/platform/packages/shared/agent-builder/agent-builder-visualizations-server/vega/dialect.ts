/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRawVegaSchema } from './vega_schema';

export { isRawVegaSchema } from './vega_schema';

/** Grammar used when authoring / normalizing a Vega-family spec. */
export type VegaDialect = 'vega-lite' | 'vega';

/** Allowlisted Raw Vega catalog intents (Dialect gate). */
export type VegaCatalogId = 'sunburst' | 'radar' | 'sankey' | 'none';

/** Catalog ids that select the Raw Vega authoring Dialect. */
export const RAW_VEGA_CATALOG_IDS = ['sunburst', 'radar', 'sankey'] as const;

export const isRawVegaCatalogId = (
  catalogId: VegaCatalogId
): catalogId is Exclude<VegaCatalogId, 'none'> =>
  (RAW_VEGA_CATALOG_IDS as readonly string[]).includes(catalogId);

/** Vega schema Kibana's Vega plugin targets. */
export const VEGA_SCHEMA = 'https://vega.github.io/schema/vega/v5.json';

/** Name of the Canonical ES|QL source dataset injected into Raw Vega specs. */
export const CANONICAL_ESQL_SOURCE_NAME = 'source';

/** Infer Dialect from a `$schema` value; defaults to Vega-Lite. */
export const dialectFromSchema = (schema: unknown): VegaDialect =>
  isRawVegaSchema(schema) ? 'vega' : 'vega-lite';

/** Infer Dialect from a stored/serialized spec (edit Dialect pin). */
export const dialectFromSpec = (
  spec: string | Record<string, unknown> | null | undefined
): VegaDialect => {
  if (!spec) {
    return 'vega-lite';
  }
  try {
    const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
    return dialectFromSchema((parsed as { $schema?: unknown } | null)?.$schema);
  } catch {
    return 'vega-lite';
  }
};

/**
 * Best-effort catalog inference from an existing Raw Vega spec (edit path).
 * Prefers structural cues so "make it blue" edits keep the right chart family.
 */
export const inferRawVegaCatalogId = (
  spec: string | Record<string, unknown> | null | undefined
): Exclude<VegaCatalogId, 'none'> | 'none' => {
  if (!spec) {
    return 'none';
  }
  try {
    const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
    const text = JSON.stringify(parsed).toLowerCase();
    if (text.includes('"stratify"') || text.includes('"partition"')) {
      return 'sunburst';
    }
    if (
      text.includes('"linkpath"') ||
      (text.includes('"stk1"') && text.includes('"stk2"') && text.includes('"fold"'))
    ) {
      return 'sankey';
    }
    if (
      text.includes('"linear-closed"') ||
      text.includes("scale('angular'") ||
      text.includes('scale("angular"') ||
      (text.includes('"angular"') && text.includes('"radial"'))
    ) {
      return 'radar';
    }
    return 'none';
  } catch {
    return 'none';
  }
};
