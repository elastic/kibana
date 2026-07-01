/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { escapeVegaFieldReferences } from './field_escaping';

/** Vega-Lite schema the generator targets. */
export const VEGA_LITE_SCHEMA = 'https://vega.github.io/schema/vega-lite/v6.json';

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
  query: string;
  '%timefield%'?: string;
}

/** Whether the query references the time-picker params (`?_tstart` / `?_tend`). */
const usesTimeParams = (query: string): boolean =>
  query.includes('?_tstart') || query.includes('?_tend');

/** First date-typed result column, used as the `%timefield%` when one exists. */
const findDateColumn = (columns: EsqlEsqlColumnInfo[] | undefined): string | undefined =>
  columns?.find((column) => column.type === 'date' || column.type === 'date_nanos')?.name;

/**
 * Build the inline ES|QL data url for Kibana's Vega renderer. A `%timefield%` is
 * added only when the query is time-aware, because Kibana's renderer only binds
 * `?_tstart`/`?_tend` when a `%timefield%` is present; without it a time-aware
 * query is sent with unbound params and fails ("Unknown query parameter").
 */
const buildEsqlDataUrl = ({
  esqlQuery,
  columns,
  timefield,
}: Pick<NormalizeVegaSpecParams, 'esqlQuery' | 'columns' | 'timefield'>): EsqlDataUrl => {
  const effectiveTimefield =
    timefield ??
    (usesTimeParams(esqlQuery) ? findDateColumn(columns) ?? DEFAULT_TIMEFIELD : undefined);

  return {
    '%type%': 'esql',
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
 * the disabling entries are dropped. The merged legend is shown either way
 * (that is exactly what Vega does — "Using false") so the rendered result is
 * unchanged; only the warning disappears. Returns a new object when it changes
 * anything; the input is not mutated.
 */
const resolveSharedLegendConflicts = (spec: Record<string, unknown>): Record<string, unknown> => {
  const layers = spec.layer;
  if (!Array.isArray(layers)) {
    return spec;
  }

  const scaleResolve = (spec.resolve as { scale?: Record<string, unknown> } | undefined)?.scale;

  const encodingOf = (layer: unknown): Record<string, { legend?: unknown }> | undefined => {
    const encoding = (layer as { encoding?: unknown } | null)?.encoding;
    return encoding && typeof encoding === 'object'
      ? (encoding as Record<string, { legend?: unknown }>)
      : undefined;
  };

  const conflicted = LEGEND_CHANNELS.filter((channel) => {
    // Independent scales render a legend per layer, so per-layer disabling is valid.
    if (scaleResolve?.[channel] === 'independent') {
      return false;
    }
    const defs = layers
      .map((layer) => encodingOf(layer)?.[channel])
      .filter((def): def is { legend?: unknown } => def != null && 'legend' in def);
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

interface NormalizeVegaSpecParams {
  /** Spec authored by the model (without a data source). */
  spec: Record<string, unknown>;
  /** Canonical ES|QL query that owns the spec's data. */
  esqlQuery: string;
  /** Result columns of the query, used to pick a date `%timefield%`. */
  columns?: EsqlEsqlColumnInfo[];
  /** Explicit event-time field; overrides the column-based detection. */
  timefield?: string;
}

/**
 * Make a model-authored Vega-Lite spec safe to render in Kibana:
 * - pin the Vega-Lite v6 `$schema`,
 * - inject the canonical ES|QL query as the data source (the model never owns it),
 * - drop fixed top-level sizing so the spec fills its container (using `fit`
 *   autosize for single/layered views; composite views are sized by Kibana
 *   without autosize, which `fit` does not support), and
 * - escape dotted ES|QL column names in field references, and
 * - drop conflicting `legend: null`/`false` entries on shared-scale layers
 *   (otherwise Vega-Lite warns `Conflicting legend property "disable"`).
 *
 * Returns a new object; the input is not mutated.
 */
export const normalizeVegaSpec = ({
  spec,
  esqlQuery,
  columns,
  timefield,
}: NormalizeVegaSpecParams): Record<string, unknown> => {
  const { width, height, data, autosize, ...rest } = resolveSharedLegendConflicts(spec);

  const url = buildEsqlDataUrl({ esqlQuery, columns, timefield });

  const normalized: Record<string, unknown> = {
    ...rest,
    $schema: VEGA_LITE_SCHEMA,
    // `fit` is only valid for single/layered views; composite views (facet/
    // repeat/concat) are sized by Kibana and must not set autosize.
    ...(isCompositeView(rest) ? {} : { autosize: { type: 'fit', contains: 'padding' } }),
    data: { url },
  };

  return escapeVegaFieldReferences(normalized);
};
