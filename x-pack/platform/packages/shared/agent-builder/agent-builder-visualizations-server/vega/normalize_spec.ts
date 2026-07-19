/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import {
  CANONICAL_ESQL_SOURCE_NAME,
  VEGA_SCHEMA,
  type VegaDialect,
  dialectFromSchema,
} from './dialect';
import { escapeVegaFieldReferences } from './field_escaping';

/** Vega-Lite schema the generator targets. */
export const VEGA_LITE_SCHEMA = 'https://vega.github.io/schema/vega-lite/v6.json';

export { VEGA_SCHEMA, CANONICAL_ESQL_SOURCE_NAME } from './dialect';

/** Default event-time field assumed when the query is time-aware but no date column is known. */
const DEFAULT_TIMEFIELD = '@timestamp';

/**
 * Composite (multi-) view keys. Vega-Lite's `autosize: "fit"` only works for
 * single and layered views, so these views must not set it (doing so emits the
 * warning: `Autosize "fit" only works for single views and layered views.`).
 */
const COMPOSITE_VIEW_KEYS = ['facet', 'repeat', 'concat', 'hconcat', 'vconcat'] as const;

/** Whether a spec is a composite view (facet/repeat/concat); Kibana sizes these without autosize. */
const isCompositeView = (spec: Record<string, unknown>): boolean =>
  COMPOSITE_VIEW_KEYS.some((key) => key in spec);

/** Inline ES|QL data source understood by Kibana's Vega renderer. */
interface EsqlDataUrl {
  '%type%': 'esql';
  '%context%': true;
  query: string;
  '%timefield%'?: string;
}

/** Whether the query references the time-picker params (`?_tstart` / `?_tend`). */
const usesTimeParams = (query: string): boolean =>
  query.includes('?_tstart') || query.includes('?_tend');

/** First date-typed result column, used as a last-resort `%timefield%`. */
const findDateColumn = (columns: EsqlEsqlColumnInfo[] | undefined): string | undefined =>
  columns?.find((column) => column.type === 'date' || column.type === 'date_nanos')?.name;

// A source field token: a name that starts with a letter or `@` (so numeric
// literals like the `75` in `TBUCKET(75, …)` are not mistaken for a field),
// optionally wrapped in backticks.
const TIME_FIELD_TOKEN = String.raw`\`?([A-Za-z@][\w.@]*)\`?`;
// `<time field> >= ?_tstart` (or `>`/`<=`/`<`, and `?_tend`).
const WHERE_TIME_FIELD = new RegExp(`${TIME_FIELD_TOKEN}\\s*(?:>=|>|<=|<)\\s*\\?_t(?:start|end)`);
// `BUCKET(<time field>, …)` — the bucketed source field (TBUCKET takes no field).
const BUCKET_TIME_FIELD = new RegExp(`\\bBUCKET\\s*\\(\\s*${TIME_FIELD_TOKEN}`, 'i');

/**
 * Extract the raw source time field bound to the time-picker params from the
 * query text. Kibana's Vega ES|QL renderer binds/filters on this `%timefield%`,
 * which must be a real source field — never a `BUCKET`/`RENAME`/`EVAL` alias,
 * because those are result columns, not filterable index fields (see issue
 * #275519). Prefers the field compared against `?_tstart`/`?_tend` in a `WHERE`
 * clause, then the field passed to `BUCKET(...)`.
 */
const extractSourceTimeField = (query: string): string | undefined =>
  query.match(WHERE_TIME_FIELD)?.[1] ?? query.match(BUCKET_TIME_FIELD)?.[1];

/**
 * Build the inline ES|QL data url for Kibana's Vega renderer. A `%timefield%` is
 * added only when the query is time-aware, because Kibana's renderer only binds
 * `?_tstart`/`?_tend` when a `%timefield%` is present; without it a time-aware
 * query is sent with unbound params and fails ("Unknown query parameter").
 *
 * The timefield is the raw source field the query filters/buckets on, recovered
 * from the query text rather than from the result columns — a bucketed date
 * result column is an alias (e.g. `Date`), not a field Kibana can bind a time
 * range to.
 */
const buildEsqlDataUrl = ({
  esqlQuery,
  columns,
  timefield,
}: Pick<NormalizeVegaSpecParams, 'esqlQuery' | 'columns' | 'timefield'>): EsqlDataUrl => {
  const effectiveTimefield =
    timefield ??
    (usesTimeParams(esqlQuery)
      ? extractSourceTimeField(esqlQuery) ?? findDateColumn(columns) ?? DEFAULT_TIMEFIELD
      : undefined);

  return {
    '%type%': 'esql',
    // Always apply the dashboard context (time range + filters) so the panel
    // stays in sync with the dashboard the chart is embedded in.
    '%context%': true,
    query: esqlQuery,
    ...(effectiveTimefield ? { '%timefield%': effectiveTimefield } : {}),
  };
};

/**
 * Mark channels that own a scale + legend in Vega-Lite. When several layers
 * encode the same channel on a *shared* scale, their legend settings are merged
 * into one; mixing an enabled legend with a disabling `legend: null`/`false`
 * triggers `Conflicting legend property "disable" (false and true). Using false.`
 */
const LEGEND_CHANNELS = [
  'color',
  'fill',
  'stroke',
  'opacity',
  'fillOpacity',
  'strokeOpacity',
  'size',
  'shape',
  'strokeWidth',
  'strokeDash',
  'angle',
] as const;

/** A legend value that disables the legend (`null` or `false`). */
const disablesLegend = (legend: unknown): boolean => legend === null || legend === false;

/**
 * Resolve the layered "Conflicting legend property" warning deterministically.
 *
 * For each legend channel encoded across a layered view on a shared scale (the
 * Vega-Lite default unless `resolve.scale[channel] = "independent"`), if some
 * layers enable the legend while others disable it with `legend: null`/`false`,
 * the disabling entries are dropped. A field-encoded channel shows a legend by
 * default, so a layer that simply omits `legend` counts as enabling it (this is
 * the common case the model produces — one layer sets `legend: null`, the others
 * leave it out). The merged legend is shown either way (that is exactly what Vega
 * does — "Using false") so the rendered result is unchanged; only the warning
 * disappears. Returns a new object when it changes anything; the input is not
 * mutated.
 */
const resolveSharedLegendConflicts = (spec: Record<string, unknown>): Record<string, unknown> => {
  const layers = spec.layer;
  if (!Array.isArray(layers)) {
    return spec;
  }

  const scaleResolve = (spec.resolve as { scale?: Record<string, unknown> } | undefined)?.scale;

  const encodingOf = (
    layer: unknown
  ): Record<string, { field?: unknown; legend?: unknown }> | undefined => {
    const encoding = (layer as { encoding?: unknown } | null)?.encoding;
    return encoding && typeof encoding === 'object'
      ? (encoding as Record<string, { field?: unknown; legend?: unknown }>)
      : undefined;
  };

  const conflicted = LEGEND_CHANNELS.filter((channel) => {
    // Independent scales render a legend per layer, so per-layer disabling is valid.
    if (scaleResolve?.[channel] === 'independent') {
      return false;
    }
    // Only field-encoded channels create a shared scale + legend; constant
    // `value` encodings do not participate, so they can neither conflict nor be
    // the "enabled" side of one.
    const defs = layers
      .map((layer) => encodingOf(layer)?.[channel])
      .filter(
        (def): def is { field?: unknown; legend?: unknown } =>
          def != null && typeof def === 'object' && 'field' in def
      );
    // An omitted `legend` on a field-encoded channel shows the legend (Vega-Lite
    // default), so it counts as enabled alongside an explicit non-null legend.
    const hasEnabled = defs.some((def) => !disablesLegend(def.legend));
    const hasDisabled = defs.some((def) => disablesLegend(def.legend));
    return hasEnabled && hasDisabled;
  });

  if (conflicted.length === 0) {
    return spec;
  }

  const newLayers = layers.map((layer) => {
    const encoding = encodingOf(layer);
    if (!encoding) {
      return layer;
    }
    const channelsToStrip = conflicted.filter((channel) =>
      disablesLegend(encoding[channel]?.legend)
    );
    if (channelsToStrip.length === 0) {
      return layer;
    }
    const newEncoding: Record<string, unknown> = { ...encoding };
    for (const channel of channelsToStrip) {
      const { legend: _legend, ...channelRest } = encoding[channel] as Record<string, unknown>;
      newEncoding[channel] = channelRest;
    }
    return { ...(layer as Record<string, unknown>), encoding: newEncoding };
  });

  return { ...spec, layer: newLayers };
};

/** Keys that hold nested child view(s): a single `spec` or an array of views. */
const CHILD_VIEW_KEYS = ['spec', 'layer', 'concat', 'hconcat', 'vconcat'] as const;

/**
 * Recursively drop `data` from every nested child view. Vega-Lite lets any view
 * declare its own `data`, which shadows the inherited source, so a stray one the
 * model authored in a `layer`/`spec`/`concat` child would bypass the ES|QL
 * source injected at the root. Only the single root source is kept. Targets view
 * containers (not a blind deep delete) so secondary datasets like a lookup
 * transform's `from.data` are left intact. Does not mutate the input.
 */
const stripNestedDataSources = (view: Record<string, unknown>): Record<string, unknown> => {
  const cleanChild = (child: unknown): unknown => {
    if (child === null || typeof child !== 'object' || Array.isArray(child)) {
      return child;
    }
    const { data: _droppedData, ...rest } = child as Record<string, unknown>;
    return stripNestedDataSources(rest);
  };

  const result: Record<string, unknown> = { ...view };
  for (const key of CHILD_VIEW_KEYS) {
    const value = result[key];
    if (Array.isArray(value)) {
      result[key] = value.map(cleanChild);
    } else if (value !== null && typeof value === 'object') {
      result[key] = cleanChild(value);
    }
  }
  return result;
};

interface NormalizeVegaSpecParams {
  /** Spec authored by the model (without a trusted data source). */
  spec: Record<string, unknown>;
  /** Canonical ES|QL query that owns the spec's data. */
  esqlQuery: string;
  /** Result columns of the query, used to pick a date `%timefield%`. */
  columns?: EsqlEsqlColumnInfo[];
  /** Explicit event-time field; overrides the column-based detection. */
  timefield?: string;
  /**
   * Dialect to normalize for. When omitted, inferred from `$schema` (Raw Vega
   * schemas stay Raw Vega; everything else is treated as Vega-Lite).
   */
  dialect?: VegaDialect;
}

/** Whether a dataset entry carries an ES|QL (or other) url the system owns. */
const hasDataUrl = (entry: unknown): boolean =>
  !!entry &&
  typeof entry === 'object' &&
  !Array.isArray(entry) &&
  'url' in (entry as Record<string, unknown>);

/**
 * Build the Raw Vega `data` array: one Canonical ES|QL source, plus any
 * derived datasets the model authored that are not themselves url-backed
 * (e.g. `stratify` / `partition` pipelines that `source` the canonical table).
 */
const buildRawVegaDataArray = ({
  modelData,
  url,
}: {
  modelData: unknown;
  url: EsqlDataUrl;
}): Array<Record<string, unknown>> => {
  const entries = Array.isArray(modelData)
    ? modelData.filter(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === 'object' && !Array.isArray(entry)
      )
    : [];

  const modelSource = entries.find(
    (entry) => entry.name === CANONICAL_ESQL_SOURCE_NAME || entry.name === 'table'
  );
  const canonicalSource: Record<string, unknown> = {
    name: CANONICAL_ESQL_SOURCE_NAME,
    url,
    ...(Array.isArray(modelSource?.transform) ? { transform: modelSource.transform } : {}),
  };

  const derived = entries.filter(
    (entry) =>
      entry.name &&
      entry.name !== CANONICAL_ESQL_SOURCE_NAME &&
      entry.name !== 'table' &&
      !hasDataUrl(entry)
  );

  return [canonicalSource, ...derived];
};

/**
 * Sequential / continuous schemes we keep on color scales. Unknown named
 * schemes (category10/20, tableau, "elastic", invented names like "pinkblue",
 * …) are rewritten to Vega's named `category` range. Kibana's Vega parser maps
 * `config.range.category` to the theme palette (see
 * visTypeVega vega_parser._setDefaultColors). Explicit hex arrays are kept so
 * a user-requested custom palette survives normalize.
 */
const KEEP_COLOR_SCHEMES = new Set([
  'blues',
  'greens',
  'greys',
  'oranges',
  'purples',
  'reds',
  'viridis',
  'plasma',
  'magma',
  'inferno',
  'cividis',
  'turbo',
]);

/** Named range that Kibana binds to the theme-aware visualization palette. */
export const KIBANA_CATEGORY_COLOR_RANGE = 'category';

const isHexColor = (value: unknown): boolean =>
  typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);

const isHexColorRange = (range: unknown): range is string[] =>
  Array.isArray(range) && range.length > 0 && range.every(isHexColor);

/**
 * Vega expression helpers are lowercase. Models often emit `Scale(` (from
 * prose / other languages); the interpreter then fails with
 * "Unrecognized function: Scale". Also normalize unicode arrows in tooltips
 * to ASCII so expression strings stay lexer-friendly.
 */
const rewriteVegaExpressionString = (expr: string): string =>
  expr
    .replace(/\bScale\s*\(/g, 'scale(')
    .replace(/\bBandwidth\s*\(/g, 'bandwidth(')
    .replace(/\bDomain\s*\(/g, 'domain(')
    .replace(/\bRange\s*\(/g, 'range(')
    .replace(/[\u2192\u2794\u279C\u27A1]/g, '->');

const EXPRESSION_STRING_KEYS = new Set(['signal', 'expr', 'test', 'update', 'init']);

/**
 * Walk a Raw Vega spec and rewrite common invalid expression helper casing
 * inside signal/expr strings (and signal `update`/`init` definitions).
 */
export const rewriteRawVegaExpressions = (value: unknown, parentKey?: string): unknown => {
  if (typeof value === 'string') {
    if (parentKey && EXPRESSION_STRING_KEYS.has(parentKey)) {
      return rewriteVegaExpressionString(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteRawVegaExpressions(entry, parentKey));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(obj)) {
    next[key] = rewriteRawVegaExpressions(child, key);
  }
  return next;
};

/**
 * Default categorical Raw Vega color scales onto Kibana's theme category
 * palette. Preserve explicit hex arrays (user-requested custom palettes).
 * Rewrite unknown named schemes — including a mistaken top-level `scheme`
 * property (models emit `"scheme": "pinkblue"` instead of `range.scheme`).
 */
export const rewriteRawVegaColorScales = (
  spec: Record<string, unknown>
): Record<string, unknown> => {
  const { scales } = spec;
  if (!Array.isArray(scales)) {
    return spec;
  }

  const nextScales = scales.map((scale) => {
    if (!scale || typeof scale !== 'object' || Array.isArray(scale)) {
      return scale;
    }
    const entry = scale as Record<string, unknown>;
    const isColorScale = entry.name === 'color' || entry.type === 'ordinal';
    if (!isColorScale) {
      return scale;
    }

    const { range, scheme: topLevelScheme, ...rest } = entry;

    // Mistaken top-level `scheme` (valid Vega puts scheme under `range`).
    if (typeof topLevelScheme === 'string') {
      const scheme = topLevelScheme.toLowerCase();
      if (KEEP_COLOR_SCHEMES.has(scheme)) {
        return { ...rest, range: { scheme: topLevelScheme } };
      }
      return { ...rest, range: KIBANA_CATEGORY_COLOR_RANGE };
    }

    if (range === KIBANA_CATEGORY_COLOR_RANGE) {
      return scale;
    }
    // User-requested custom palette — keep hex arrays as authored.
    if (isHexColorRange(range)) {
      return scale;
    }
    if (range && typeof range === 'object' && !Array.isArray(range)) {
      const scheme = (range as { scheme?: unknown }).scheme;
      if (typeof scheme === 'string' && !KEEP_COLOR_SCHEMES.has(scheme.toLowerCase())) {
        return { ...entry, range: KIBANA_CATEGORY_COLOR_RANGE };
      }
    }
    return scale;
  });

  return { ...spec, scales: nextScales };
};

/** Correct Sankey y-domain: stacked node extents, not a unit interval. */
export const SANKEY_Y_DOMAIN = { data: 'nodes', field: 'y1' } as const;

const dataSetNames = (spec: Record<string, unknown>): Set<string> => {
  const names = new Set<string>();
  if (!Array.isArray(spec.data)) {
    return names;
  }
  for (const entry of spec.data) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const { name } = entry as { name?: unknown };
      if (typeof name === 'string') {
        names.add(name);
      }
    }
  }
  return names;
};

const looksLikeSankeySpec = (spec: Record<string, unknown>): boolean => {
  const names = dataSetNames(spec);
  return names.has('nodes') && (names.has('edges') || names.has('groups'));
};

const isNodesY1Domain = (domain: unknown): boolean =>
  !!domain &&
  typeof domain === 'object' &&
  !Array.isArray(domain) &&
  (domain as { data?: unknown }).data === 'nodes' &&
  (domain as { field?: unknown }).field === 'y1';

/**
 * Models often emit Sankey `y.domain: [0, 1]` (unit interval / radar muscle
 * memory). Stacked flight counts are hundreds–thousands, so every mark scales
 * off-screen and the panel looks empty. Force the reference domain.
 */
export const rewriteSankeyYScaleDomain = (
  spec: Record<string, unknown>
): Record<string, unknown> => {
  if (!looksLikeSankeySpec(spec) || !Array.isArray(spec.scales)) {
    return spec;
  }

  let changed = false;
  const nextScales = spec.scales.map((scale) => {
    if (!scale || typeof scale !== 'object' || Array.isArray(scale)) {
      return scale;
    }
    const entry = scale as Record<string, unknown>;
    if (entry.name !== 'y') {
      return scale;
    }
    if (isNodesY1Domain(entry.domain)) {
      return scale;
    }
    changed = true;
    return { ...entry, domain: { ...SANKEY_Y_DOMAIN } };
  });

  return changed ? { ...spec, scales: nextScales } : spec;
};

/**
 * Harden a stored Vega panel spec without rebinding ES|QL (dashboard
 * `source: "config"` path). Applies the same layout / color / Sankey /
 * expression / field-escape fixes as {@link normalizeVegaSpec}, but keeps the
 * existing `data` urls. Does not run the headless validator.
 *
 * Returns a new object; the input is not mutated.
 */
export const hardenStoredVegaSpec = (spec: Record<string, unknown>): Record<string, unknown> => {
  const dialect = dialectFromSchema(spec.$schema);

  if (dialect === 'vega') {
    const { width, height, autosize, encode, $schema, ...rest } = spec;
    const withColors = rewriteRawVegaColorScales({
      ...rest,
      $schema: VEGA_SCHEMA,
    });
    const withSankeyY = rewriteSankeyYScaleDomain(withColors);
    return escapeVegaFieldReferences(
      rewriteRawVegaExpressions(withSankeyY) as Record<string, unknown>
    );
  }

  const { width, height, autosize, ...rest } = spec;
  const normalized: Record<string, unknown> = {
    ...rest,
    $schema: VEGA_LITE_SCHEMA,
    ...(isCompositeView(rest) ? {} : { autosize: { type: 'fit', contains: 'padding' } }),
  };
  return escapeVegaFieldReferences(
    rewriteRawVegaExpressions(normalized) as Record<string, unknown>
  );
};

/**
 * Make a model-authored Vega-family spec safe to render in Kibana:
 * - pin `$schema` for the chosen Dialect (Vega-Lite v6 or Vega v5),
 * - inject the canonical ES|QL query as the data source (the model never owns it),
 * - for Vega-Lite: drop nested child `data`, apply fit autosize / legend fixes,
 * - for Raw Vega: inject a named Canonical ES|QL source and keep derived datasets,
 * - rewrite categorical color schemes to the named `category` range (Kibana theme),
 * - rewrite mistyped expression helpers (`Scale(` → `scale(`) and unicode arrows,
 * - force Sankey y domain onto stacked `nodes.y1` (never a unit `[0, 1]` interval),
 * - escape dotted ES|QL column names in field references.
 *
 * Returns a new object; the input is not mutated.
 */
export const normalizeVegaSpec = ({
  spec,
  esqlQuery,
  columns,
  timefield,
  dialect: dialectOverride,
}: NormalizeVegaSpecParams): Record<string, unknown> => {
  const dialect = dialectOverride ?? dialectFromSchema(spec.$schema);
  const url = buildEsqlDataUrl({ esqlQuery, columns, timefield });

  if (dialect === 'vega') {
    // Strip fixed size / autosize / root encode: Kibana's parser applies
    // fit + container resize. autosize "none" blanks the panel (useResize=false);
    // root encode x/y = width/2,height/2 (radar centering) offsets the chart
    // into a corner once the panel sizes the view. Center in mark signals
    // instead (see radar reference example).
    const { width, height, data, autosize, $schema, encode, ...rest } = spec;
    const withColors = rewriteRawVegaColorScales({
      ...rest,
      $schema: VEGA_SCHEMA,
      data: buildRawVegaDataArray({ modelData: data, url }),
    });
    const withSankeyY = rewriteSankeyYScaleDomain(withColors);
    const normalized = rewriteRawVegaExpressions(withSankeyY) as Record<string, unknown>;
    return escapeVegaFieldReferences(normalized);
  }

  const { width, height, data, autosize, ...rest } = resolveSharedLegendConflicts(spec);

  const normalized: Record<string, unknown> = {
    ...stripNestedDataSources(rest),
    $schema: VEGA_LITE_SCHEMA,
    // `fit` is only valid for single/layered views; composite views (facet/
    // repeat/concat) are sized by Kibana and must not set autosize.
    ...(isCompositeView(rest) ? {} : { autosize: { type: 'fit', contains: 'padding' } }),
    data: { url },
  };

  return escapeVegaFieldReferences(normalized);
};
