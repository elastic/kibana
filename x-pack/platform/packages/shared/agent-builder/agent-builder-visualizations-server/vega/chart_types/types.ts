/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { VegaCatalogId, VegaDialect } from '../dialect';

export type CatalogIntegrityArgs = {
  columns?: EsqlEsqlColumnInfo[];
  values?: unknown[][];
};

export type CatalogIntegrityResult = {
  ok: boolean;
  error: string;
};

type SelectionPrompt = {
  /** Classifier / example-picker description. */
  description: string;
  /** Short “choose when…” guideline (Lens-aligned). */
  guideline: string;
  /** Human title for reference blocks / author labels. */
  title: string;
};

type ExampleLoader = {
  load: () => Promise<Record<string, unknown>>;
  /** Longer structural blurb for REFERENCE EXAMPLES blocks (defaults to selection.description). */
  description?: string;
};

/** Allowlisted Raw Vega chart type (Dialect gate + integrity + ES|QL shape). */
export type RawVegaChartTypeEntry = {
  readonly dialect: 'vega';
  readonly id: Exclude<VegaCatalogId, 'none'>;
  /** Short label for the Raw Vega author prompt. */
  readonly chartLabel: string;
  readonly prompt: {
    selection: SelectionPrompt;
    config: {
      /** Heading for authoring rules, e.g. "SUNBURST RULES". */
      rulesHeading: string;
      /** Top-level rule bullets (may include nested indented lines). */
      perChartTypeRules: string[];
      esqlAdditionalInstructions: string;
    };
  };
  readonly example: ExampleLoader;
  readonly disclosedFallbackContext: string;
  readonly checkIntegrity: (args: CatalogIntegrityArgs) => CatalogIntegrityResult;
};

/** Vega-Lite structural reference example (LLM-selected authoring skeleton). */
export type VegaLiteChartTypeEntry = {
  readonly dialect: 'vega-lite';
  readonly id: string;
  readonly prompt: {
    selection: SelectionPrompt;
  };
  readonly example: ExampleLoader;
};

export type VegaChartTypeEntry = RawVegaChartTypeEntry | VegaLiteChartTypeEntry;

export type VegaLiteReferenceExampleId =
  | 'layered_combo_dual_axis'
  | 'faceted_small_multiples'
  | 'scatter_bubble'
  | 'heatmap'
  | 'timeline_gantt'
  | 'calendar_heatmap';

/** Format Raw authoring rules the same way as the legacy chartRules string. */
export const formatRawChartRules = (entry: RawVegaChartTypeEntry): string =>
  `${entry.prompt.config.rulesHeading}:\n${entry.prompt.config.perChartTypeRules
    .map((rule) => `- ${rule}`)
    .join('\n')}`;

/** Wrap dialect validators into the registry integrity result shape. */
export const wrapIntegrity = <T extends { ok: boolean }>(
  validate: (args: CatalogIntegrityArgs) => T,
  formatError: (result: T) => string
): ((args: CatalogIntegrityArgs) => CatalogIntegrityResult) => {
  return (args) => {
    const result = validate(args);
    return { ok: result.ok, error: formatError(result) };
  };
};

export type { VegaDialect };
