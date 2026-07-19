/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import {
  RADAR_DISCLOSED_FALLBACK_CONTEXT,
  SANKEY_DISCLOSED_FALLBACK_CONTEXT,
  SUNBURST_DISCLOSED_FALLBACK_CONTEXT,
  formatParentChildIntegrityError,
  formatRadarIntegrityError,
  formatSankeyIntegrityError,
  isRawVegaCatalogId,
  validateParentChildRows,
  validateRadarRows,
  validateSankeyRows,
  type VegaCatalogId,
} from './dialect';
import type { VegaReferenceExample } from './reference_examples';
import {
  chartRules as radarChartRules,
  esqlAdditionalInstructions as radarEsqlAdditionalInstructions,
} from './reference_examples/radar';
import {
  chartRules as sankeyChartRules,
  esqlAdditionalInstructions as sankeyEsqlAdditionalInstructions,
} from './reference_examples/sankey';
import {
  chartRules as sunburstChartRules,
  esqlAdditionalInstructions as sunburstEsqlAdditionalInstructions,
} from './reference_examples/sunburst';

export type CatalogIntegrityArgs = {
  columns?: EsqlEsqlColumnInfo[];
  values?: unknown[][];
};

export type CatalogIntegrityResult = {
  ok: boolean;
  error: string;
};

/** Per-catalog metadata + behavior for allowlisted Raw Vega charts. */
export type RawVegaCatalogEntry = {
  readonly id: Exclude<VegaCatalogId, 'none'>;
  /** Classifier allowlist blurb. */
  readonly classifierDescription: string;
  /** Short label for the Raw Vega author prompt. */
  readonly chartLabel: string;
  readonly example: VegaReferenceExample;
  readonly chartRules: string;
  readonly esqlAdditionalInstructions: string;
  readonly disclosedFallbackContext: string;
  readonly checkIntegrity: (args: CatalogIntegrityArgs) => CatalogIntegrityResult;
};

const wrapIntegrity = <T extends { ok: boolean }>(
  validate: (args: CatalogIntegrityArgs) => T,
  formatError: (result: T) => string
): ((args: CatalogIntegrityArgs) => CatalogIntegrityResult) => {
  return (args) => {
    const result = validate(args);
    return { ok: result.ok, error: formatError(result) };
  };
};

export const RAW_VEGA_CATALOG: Record<Exclude<VegaCatalogId, 'none'>, RawVegaCatalogEntry> = {
  sunburst: {
    id: 'sunburst',
    classifierDescription:
      'Radial hierarchy / sunburst / ring partition of a parent-child tree (not a treemap, pie, or donut).',
    chartLabel: 'sunburst / hierarchy',
    example: {
      id: 'sunburst',
      title: 'Sunburst / hierarchy (Raw Vega partition)',
      description:
        'Static radial hierarchy: Parent–child table (parent rows AND leaves — every parent id must exist as an id) → `stratify` + `partition` → `arc` marks. Bind the Canonical ES|QL source named `source`; do not add Kibana interaction signals.',
      load: () => import('./reference_examples/sunburst').then((module) => module.spec),
    },
    chartRules: sunburstChartRules,
    esqlAdditionalInstructions: sunburstEsqlAdditionalInstructions,
    disclosedFallbackContext: SUNBURST_DISCLOSED_FALLBACK_CONTEXT,
    checkIntegrity: wrapIntegrity(validateParentChildRows, formatParentChildIntegrityError),
  },
  radar: {
    id: 'radar',
    classifierDescription:
      'Radar / spider / polar multivariate chart comparing numeric measures across several axes (not a pie or radial bar).',
    chartLabel: 'radar / spider',
    example: {
      id: 'radar',
      title: 'Radar / spider (Raw Vega polar)',
      description:
        'Static radar: key/value rows (≥3 distinct keys; optional series) → angular + radial scales → faceted `line` marks with `linear-closed`. Center with absolute width/2 + height/2 in mark signals (never top-level encode). Bind the Canonical ES|QL source named `source`; do not add Kibana interaction signals.',
      load: () => import('./reference_examples/radar').then((module) => module.spec),
    },
    chartRules: radarChartRules,
    esqlAdditionalInstructions: radarEsqlAdditionalInstructions,
    disclosedFallbackContext: RADAR_DISCLOSED_FALLBACK_CONTEXT,
    checkIntegrity: wrapIntegrity(validateRadarRows, formatRadarIntegrityError),
  },
  sankey: {
    id: 'sankey',
    classifierDescription:
      'Sankey / flow / alluvial diagram of weighted flows between a source category and a destination category (two stacks).',
    chartLabel: 'sankey / flow',
    example: {
      id: 'sankey',
      title: 'Sankey / flow (Raw Vega two-stack)',
      description:
        'Static two-stack Sankey: stk1/stk2/size flow rows → fold+stack nodes → groups + linkpath edges → path/rect/text. Use range "category" for Kibana theme colors and padding so axis/stack labels stay inside the panel. Bind the Canonical ES|QL source named `source`; do not add click-to-filter signals.',
      load: () => import('./reference_examples/sankey').then((module) => module.spec),
    },
    chartRules: sankeyChartRules,
    esqlAdditionalInstructions: sankeyEsqlAdditionalInstructions,
    disclosedFallbackContext: SANKEY_DISCLOSED_FALLBACK_CONTEXT,
    checkIntegrity: wrapIntegrity(validateSankeyRows, formatSankeyIntegrityError),
  },
};

/** Stable iteration order for classifier allowlists. */
export const RAW_VEGA_CATALOG_ENTRIES: readonly RawVegaCatalogEntry[] = [
  RAW_VEGA_CATALOG.sunburst,
  RAW_VEGA_CATALOG.radar,
  RAW_VEGA_CATALOG.sankey,
];

export const getRawVegaCatalogEntry = (
  catalogId: VegaCatalogId
): RawVegaCatalogEntry | undefined =>
  isRawVegaCatalogId(catalogId) ? RAW_VEGA_CATALOG[catalogId] : undefined;

/** Resolve per-catalog Raw Vega authoring rules co-located with each example. */
export const catalogChartRules = (catalogId: VegaCatalogId): string =>
  getRawVegaCatalogEntry(catalogId)?.chartRules ?? '';

/** Resolve per-catalog ES|QL shape instructions (empty when catalog is none). */
export const catalogEsqlAdditionalInstructions = (catalogId: VegaCatalogId): string =>
  getRawVegaCatalogEntry(catalogId)?.esqlAdditionalInstructions ?? '';

/** Catalog-specific row integrity for ES|QL results (passes when catalog is none). */
export const checkCatalogIntegrity = (
  catalogId: VegaCatalogId,
  args: CatalogIntegrityArgs
): CatalogIntegrityResult => {
  const entry = getRawVegaCatalogEntry(catalogId);
  if (!entry) {
    return { ok: true, error: '' };
  }
  return entry.checkIntegrity(args);
};

/** Disclosed-fallback authoring context for a catalog id (empty when none). */
export const disclosedFallbackContextForCatalog = (catalogId: VegaCatalogId): string =>
  getRawVegaCatalogEntry(catalogId)?.disclosedFallbackContext ?? '';
