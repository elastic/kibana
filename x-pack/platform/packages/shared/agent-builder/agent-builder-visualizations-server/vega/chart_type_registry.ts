/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRawVegaCatalogId, type VegaCatalogId } from './dialect';
import { chartType as calendarHeatmap } from './chart_types/calendar_heatmap';
import { chartType as facetedSmallMultiples } from './chart_types/faceted_small_multiples';
import { chartType as heatmap } from './chart_types/heatmap';
import { chartType as layeredComboDualAxis } from './chart_types/layered_combo_dual_axis';
import { chartType as radar } from './chart_types/radar';
import { chartType as sankey } from './chart_types/sankey';
import { chartType as scatterBubble } from './chart_types/scatter_bubble';
import { chartType as sunburst } from './chart_types/sunburst';
import { chartType as timelineGantt } from './chart_types/timeline_gantt';
import {
  formatRawChartRules,
  type CatalogIntegrityArgs,
  type CatalogIntegrityResult,
  type RawVegaChartTypeEntry,
  type VegaChartTypeEntry,
  type VegaLiteChartTypeEntry,
  type VegaLiteReferenceExampleId,
} from './chart_types/types';

/**
 * Central registry for Vega-family chart types (Raw allowlist + VL reference
 * skeletons). Mirrors Lens `chart_type_registry.ts`: selection/config prompts
 * live here; curated specs load via `example` instead of a Lens schema.
 *
 * To add a Raw chart: extend `VegaCatalogId`, add `chart_types/<id>.ts`, register
 * below (TypeScript enforces Raw exhaustiveness via `rawVegaChartTypeRegistry`).
 * To add a VL reference skeleton: add `chart_types/<id>.ts` and register in
 * `vegaLiteChartTypeRegistry`.
 */
export const rawVegaChartTypeRegistry = {
  sunburst,
  radar,
  sankey,
} as const satisfies Record<Exclude<VegaCatalogId, 'none'>, RawVegaChartTypeEntry>;

export const vegaLiteChartTypeRegistry = {
  layered_combo_dual_axis: layeredComboDualAxis,
  faceted_small_multiples: facetedSmallMultiples,
  scatter_bubble: scatterBubble,
  heatmap,
  timeline_gantt: timelineGantt,
  calendar_heatmap: calendarHeatmap,
} as const satisfies Record<VegaLiteReferenceExampleId, VegaLiteChartTypeEntry>;

export const chartTypeRegistry = {
  ...rawVegaChartTypeRegistry,
  ...vegaLiteChartTypeRegistry,
} as const satisfies Record<string, VegaChartTypeEntry>;

export type VegaChartTypeRegistry = typeof chartTypeRegistry;

/** Stable iteration order for Dialect-gate allowlists. */
export const rawVegaChartTypes: readonly RawVegaChartTypeEntry[] = [
  rawVegaChartTypeRegistry.sunburst,
  rawVegaChartTypeRegistry.radar,
  rawVegaChartTypeRegistry.sankey,
];

/** Stable iteration order for VL reference-example selection. */
export const vegaLiteReferenceTypes: readonly VegaLiteChartTypeEntry[] = [
  vegaLiteChartTypeRegistry.layered_combo_dual_axis,
  vegaLiteChartTypeRegistry.faceted_small_multiples,
  vegaLiteChartTypeRegistry.scatter_bubble,
  vegaLiteChartTypeRegistry.heatmap,
  vegaLiteChartTypeRegistry.timeline_gantt,
  vegaLiteChartTypeRegistry.calendar_heatmap,
];

/** @deprecated Use rawVegaChartTypes */
export const RAW_VEGA_CATALOG_ENTRIES = rawVegaChartTypes;

export const getRawVegaChartType = (
  catalogId: VegaCatalogId
): RawVegaChartTypeEntry | undefined =>
  isRawVegaCatalogId(catalogId) ? rawVegaChartTypeRegistry[catalogId] : undefined;

/** @deprecated Use getRawVegaChartType */
export const getRawVegaCatalogEntry = getRawVegaChartType;

/** Resolve per-catalog Raw Vega authoring rules. */
export const catalogChartRules = (catalogId: VegaCatalogId): string => {
  const entry = getRawVegaChartType(catalogId);
  return entry ? formatRawChartRules(entry) : '';
};

/** Resolve per-catalog ES|QL shape instructions (empty when catalog is none). */
export const catalogEsqlAdditionalInstructions = (catalogId: VegaCatalogId): string =>
  getRawVegaChartType(catalogId)?.prompt.config.esqlAdditionalInstructions ?? '';

/** Catalog-specific row integrity for ES|QL results (passes when catalog is none). */
export const checkCatalogIntegrity = (
  catalogId: VegaCatalogId,
  args: CatalogIntegrityArgs
): CatalogIntegrityResult => {
  const entry = getRawVegaChartType(catalogId);
  if (!entry) {
    return { ok: true, error: '' };
  }
  return entry.checkIntegrity(args);
};

/** Disclosed-fallback authoring context for a catalog id (empty when none). */
export const disclosedFallbackContextForCatalog = (catalogId: VegaCatalogId): string =>
  getRawVegaChartType(catalogId)?.disclosedFallbackContext ?? '';

export type {
  CatalogIntegrityArgs,
  CatalogIntegrityResult,
  RawVegaChartTypeEntry,
  VegaChartTypeEntry,
  VegaLiteChartTypeEntry,
};
