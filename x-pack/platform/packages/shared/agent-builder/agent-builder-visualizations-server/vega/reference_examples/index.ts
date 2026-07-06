/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

/**
 * A curated Vega-Lite reference example the authoring model can adapt.
 *
 * The catalog only covers the *non-trivial* chart shapes that a standard Lens
 * chart cannot express and that the model most often gets structurally wrong —
 * combination (dual-axis) charts, faceted small multiples, scatter/bubble plots,
 * heatmaps, timeline/Gantt ranged bars, and calendar heatmaps. Simple single-series
 * bar/line charts are deliberately omitted: they route to Lens and need no example
 * here. Chart shapes that Vega-Lite cannot express (Sankey, radar, sunburst) are
 * out of scope until raw-Vega support lands.
 *
 * Only lightweight metadata (`match`, `title`, `description`) lives here; the
 * spec body is *referenced content* loaded on demand via {@link VegaReferenceExample.load}
 * so a request only pays to materialize the examples it actually matches. Each
 * spec is a guideline-compliant skeleton (auto-sizing, single legend per shared
 * scale, `sort: null` on shared axes, escaped dotted fields, explicit time-range
 * filtering on the raw source field), with colors left to the theme / built-in
 * schemes rather than a hardcoded palette.
 */
export interface VegaReferenceExample {
  /** Stable identifier (also used in tests). */
  readonly id: string;
  /** Short human-facing title shown above the spec. */
  readonly title: string;
  /** When to reach for this pattern. */
  readonly description: string;
  /**
   * Patterns matched (case-insensitively, statelessly) against the request text.
   * Defined without the global flag so repeated `test()` calls stay stateless.
   */
  readonly match: readonly RegExp[];
  /** Lazily load the illustrative Vega-Lite (v6) spec for this example. */
  readonly load: () => Promise<Record<string, unknown>>;
}

/** A reference example whose spec body has been materialized. */
export interface LoadedVegaReferenceExample {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly spec: Record<string, unknown>;
}

/**
 * Catalog metadata, in priority order for equal-score ties. Spec bodies are
 * referenced (not imported) so they load only when their example is selected.
 */
export const VEGA_REFERENCE_EXAMPLES: readonly VegaReferenceExample[] = [
  {
    id: 'layered_combo_dual_axis',
    title: 'Combination chart (bars + overlaid line, dual axis)',
    description:
      'Two metrics over a shared axis: bars for one, an overlaid line for the other, on independent y-scales. Share the x encoding at the top level, set `sort: null` on any shared categorical axis, give each layer its own y `axis.title`, and put `resolve.scale.y = "independent"` at the top level.',
    match: [
      /dual[-\s]?axis/,
      /\bcombo\b|combination/,
      /overla(y|id|ying)/,
      /bar.*\bline\b|\bline\b.*bar/,
      /(count|bars?).*(average|avg|line)/,
      /two (metrics|measures|series|y[-\s]?axes)/,
    ],
    load: () => import('./layered_combo_dual_axis').then((module) => module.spec),
  },
  {
    id: 'faceted_small_multiples',
    title: 'Faceted small multiples (one panel per category)',
    description:
      'Split one chart into a grid of small multiples: a top-level `facet` (the splitting field) plus a per-cell `spec`, with `columns` as a SIBLING of `facet`/`spec` (never inside `facet`). Auto-sizing does not apply to facets, so set explicit `width`/`height` on the inner `spec`. Keep the facet field low-cardinality (pre-limit in ES|QL).',
    match: [
      /small multiples/,
      /\bfacet(s|ed|ing)?\b/,
      /one (panel|chart|plot|line|graph) per\b/,
      /a (panel|chart|plot) (for|per) each/,
      /grid of (charts|panels|plots)/,
      /split (in)?to (panels|charts|plots)/,
    ],
    load: () => import('./faceted_small_multiples').then((module) => module.spec),
  },
  {
    id: 'scatter_bubble',
    title: 'Scatter / bubble plot (encoded size)',
    description:
      'Relate two measures per entity with a `point` mark: quantitative `x` and `y`, a third measure as `size` (bubble), and a category as `color`. Disable zero baselines (`scale.zero = false`) when comparing magnitudes. Still filter by the time picker even without a temporal axis.',
    match: [
      /scatter/,
      /bubble/,
      /correlat/,
      /\bvs\.?\b|versus/,
      /size\s*=|bubble size|sized? by/,
      /relationship between/,
    ],
    load: () => import('./scatter_bubble').then((module) => module.spec),
  },
  {
    id: 'heatmap',
    title: 'Heatmap (two categories + color measure)',
    description:
      'Density across two dimensions with a `rect` mark: an ordinal/nominal `x` and `y`, and a sequential `color` scheme for the measure. Extract categorical buckets with `EVAL`, but keep the time-picker filter on the raw source field.',
    match: [/heat\s?map/, /\bmatrix\b/, /\bby hour\b.*\bday\b|\bday\b.*\bby hour\b/, /density/],
    load: () => import('./heatmap').then((module) => module.spec),
  },
  {
    id: 'timeline_gantt',
    title: 'Timeline / Gantt (ranged bars)',
    description:
      'Show the start-to-end span of each item as a horizontal ranged bar: a `bar` mark with a temporal `x` (start) and `x2` (end) against a nominal `y` (the item). Produce the start/end columns in ES|QL (e.g. `MIN`/`MAX` of the time field per item), pre-sort by start and set `sort: null` on `y`. Keep the time-picker filter on the raw source field.',
    match: [
      /\bgantt\b/,
      /timeline/,
      /\bschedule\b/,
      /duration(s)? (of|per|by|for)\b/,
      /start (and|to) end|(start|end) (time|date)s?/,
      /\bspans?\b/,
    ],
    load: () => import('./timeline_gantt').then((module) => module.spec),
  },
  {
    id: 'calendar_heatmap',
    title: 'Calendar heatmap (week × weekday grid)',
    description:
      'GitHub-style calendar heatmap: a `rect` mark with an ordinal `x` for the week and an ordinal `y` for the weekday (explicitly sorted Mon→Sun via `sort`), colored by a sequential `scheme`. Derive the week/weekday buckets with `EVAL DATE_FORMAT(...)` and keep the time-picker filter on the raw source field.',
    match: [
      /calendar/,
      /contribution (graph|chart)/,
      /github[-\s]?style/,
      /by (week and )?weekday/,
      /activity (heat\s?map|calendar)/,
    ],
    load: () => import('./calendar_heatmap').then((module) => module.spec),
  },
];

/** Never inject more than this many examples, to keep the prompt bounded. */
const MAX_SELECTED_EXAMPLES = 2;

/**
 * Pick the reference examples whose keyword patterns best match the request,
 * returning their metadata only (no spec content is loaded here). Returns the
 * highest-scoring examples (at most {@link MAX_SELECTED_EXAMPLES}), or an empty
 * array when nothing matches — a plain chart gets no example rather than a
 * misleading one. Catalog order breaks ties so selection is deterministic.
 */
export const selectReferenceExamples = (
  nlQuery: string,
  chartType?: SupportedChartType
): VegaReferenceExample[] => {
  const haystack = `${nlQuery} ${chartType ?? ''}`.toLowerCase();

  return VEGA_REFERENCE_EXAMPLES.map((example) => ({
    example,
    score: example.match.reduce((total, pattern) => total + (pattern.test(haystack) ? 1 : 0), 0),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SELECTED_EXAMPLES)
    .map(({ example }) => example);
};

/**
 * Select the matching examples and load *only their* spec bodies. This is the
 * single entry point that materializes referenced content, so unmatched examples
 * are never loaded.
 */
export const loadReferenceExamples = async (
  nlQuery: string,
  chartType?: SupportedChartType
): Promise<LoadedVegaReferenceExample[]> => {
  const selected = selectReferenceExamples(nlQuery, chartType);

  return Promise.all(
    selected.map(async ({ id, title, description, load }) => ({
      id,
      title,
      description,
      spec: await load(),
    }))
  );
};

/**
 * Render loaded examples as a prompt section. Returns an empty string when there
 * are none so callers can inject it unconditionally.
 */
export const formatReferenceExamples = (examples: LoadedVegaReferenceExample[]): string => {
  if (examples.length === 0) {
    return '';
  }

  const blocks = examples
    .map(
      (example) =>
        `### ${example.title}\n${example.description}\n\`\`\`json\n${JSON.stringify(
          example.spec,
          null,
          2
        )}\n\`\`\``
    )
    .join('\n\n');

  return `
REFERENCE EXAMPLES:
Adapt the structural pattern(s) below to the request. Do NOT copy their data source, fields, or query — bind the columns listed above. They illustrate correct structure only.

${blocks}`;
};
