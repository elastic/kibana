/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKibanaDashboardSavedObject } from './kibana/from-saved-object/dashboard/from_dashboard_saved_object';
import { parseSavedObjectNdjson } from './kibana/from-saved-object/ndjson';
import { planAdaptiveDashboard } from './kibana/plan/plan_adaptive_dashboard';
import { resolveInstantMs } from './kibana/from-saved-object/lens/time';
import { dimensionsFromEsql, splitTopLevel } from './esql_dimensions';
import { type VegaSource, vegaSources } from './vega';

type Envelope = ReturnType<typeof parseSavedObjectNdjson>[number];
type FieldFormatsResolver = NonNullable<
  Parameters<typeof fromKibanaDashboardSavedObject>[1]
>['resolveDataViewFieldFormats'];
type ViewPlan = ReturnType<typeof planAdaptiveDashboard>;
export type PlanQuery = ViewPlan['queries'][number];
export type PlanBinding = ViewPlan['bindings'][number];

/** How a query column maps back to its source field, for selection predicates. */
export type Dimension =
  | { kind: 'date_histogram'; field: string; intervalMs: number }
  /** `derived` widths come from ES|QL's auto-width rule and are checked against the returned keys. */
  | { kind: 'histogram'; field: string; width: number; derived?: boolean }
  | { kind: 'terms'; field: string };

export interface PlannedPanel {
  /** The dashboard's `panelIndex`, stable across exports. */
  panelId: string;
  queryId: string;
  binding: PlanBinding;
  query: PlanQuery;
  /** Keyed by the query's column names, which are the Lens column ids. */
  dimensions: Record<string, Dimension>;
  /** The panel's Lens saved-object attributes, as exported. */
  lens?: Record<string, unknown>;
  /** Kibana grid units: 48 columns, 20-pixel rows. */
  grid?: GridData;
  /** The panel's own time range, which its query and `auxiliaryEsql` already use. */
  timeRange?: TimeRange;
  /** Overrides the dashboard's `auxiliaryEsql` for a panel with its own time range. */
  auxiliaryEsql?: Record<string, string>;
  hidePanelTitles?: boolean;
}

export interface GridData {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A `vega` node whose Elasticsearch sources the host runs and inlines before validation. */
export interface PlannedVegaPanel {
  panelId: string;
  specPath: Array<string | number>;
  sources: VegaSource[];
}

export interface PlannedDashboard {
  title: string;
  spec: ViewPlan['spec'];
  panels: PlannedPanel[];
  vegaPanels: PlannedVegaPanel[];
  /** What `%timefield%` filters on; absent when neither the request nor the dashboard sets one. */
  timeRange?: TimeRange;
  /** Panels whose own time range the lowering could not turn into a query, by panel id. */
  unresolvedPanelTimeRanges: Record<string, TimeRange>;
  /** ES|QL of queries no panel binds directly, such as a metric's trend, by query id. */
  auxiliaryEsql: Record<string, string>;
  diagnostics: unknown[];
}

interface DashboardPanelJson {
  panelIndex: string;
  panelRefName?: string;
  gridData?: GridData;
  embeddableConfig?: {
    attributes?: Envelope['attributes'];
    timeRange?: TimeRange;
    hidePanelTitles?: boolean;
  };
}

interface LensColumn {
  operationType?: string;
  sourceField?: string;
  params?: { type?: string; interval?: number | string };
}

const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  second: 1_000,
  seconds: 1_000,
  m: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
};

/** The text from `from` up to the parenthesis that closes the one opened just before it. */
const balancedArguments = (text: string, from: number): string => {
  let depth = 1;
  let quote: string | undefined;
  for (let index = from; index < text.length; index += 1) {
    const char = text[index]!;
    if (quote) {
      quote = char === quote ? undefined : quote;
    } else if (char === '"' || char === '`') {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')' && --depth === 0) {
      return text.slice(from, index);
    }
  }
  return text.slice(from);
};

/** The fixed width of `column = BUCKET(<expression>, <n> <unit>)` in the query that actually ran. */
const bucketIntervalMs = (esql: string, column: string): number | undefined => {
  const quoted = column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = new RegExp(`\`?${quoted}\`?\\s*=\\s*BUCKET\\(`, 'i').exec(esql);
  if (!start) {
    return undefined;
  }
  // The first argument may itself hold commas, e.g. the `CASE` a time shift aligns buckets with.
  const span =
    splitTopLevel(balancedArguments(esql, start.index + start[0].length), ',').at(-1) ?? '';
  const match = /^(\d+)\s*([a-z]+)$/i.exec(span);
  const unit = match ? UNIT_MS[match[2]!.toLowerCase()] : undefined;
  return match && unit !== undefined ? Number(match[1]) * unit : undefined;
};

/** Whether the query groups `column` by a plain `EVAL column = field`, with no bucketing. */
const groupsByRawValue = (esql: string, column: string, field: string): boolean => {
  const quoted = (name: string) => `\`?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\`?`;
  return new RegExp(`${quoted(column)}\\s*=\\s*${quoted(field)}\\s*(\\||,|$)`).test(esql);
};

const lensColumns = (lens: Pick<Envelope, 'attributes'>): Record<string, LensColumn> => {
  const state = (
    lens.attributes as {
      state?: {
        datasourceStates?: {
          formBased?: { layers?: Record<string, { columns?: Record<string, LensColumn> }> };
        };
      };
    }
  ).state;
  const layers = state?.datasourceStates?.formBased?.layers ?? {};
  return Object.assign({}, ...Object.values(layers).map(({ columns }) => columns ?? {}));
};

const dimensionsFor = (
  lens: Pick<Envelope, 'attributes'>,
  esql: string
): Record<string, Dimension> => {
  const dimensions: Record<string, Dimension> = {};
  for (const [column, { operationType, sourceField, params }] of Object.entries(
    lensColumns(lens)
  )) {
    if (!sourceField) {
      continue;
    }
    if (operationType === 'terms') {
      dimensions[column] = { kind: 'terms', field: sourceField };
    } else if (
      operationType === 'range' &&
      params?.type === 'histogram' &&
      groupsByRawValue(esql, column, sourceField)
    ) {
      // Lens asks for an `auto` interval without bounds, which Kibana's `calculateHistogramInterval` resolves to 1.
      dimensions[column] = {
        kind: 'histogram',
        field: sourceField,
        width: typeof params.interval === 'number' ? params.interval : 1,
      };
    } else if (operationType === 'date_histogram') {
      const intervalMs = bucketIntervalMs(esql, column);
      if (intervalMs !== undefined) {
        dimensions[column] = { kind: 'date_histogram', field: sourceField, intervalMs };
      }
    }
  }
  return dimensions;
};

/** Kibana's grid is 48 columns of a roughly 1200-pixel dashboard and 20-pixel rows. */
const KIBANA_COLUMN_PX = 25;
const KIBANA_ROW_PX = 20;

interface GridItem {
  w: number;
  h: number;
  node: { type: string; width?: number; height?: number; spec?: Record<string, unknown> };
}

/** Sizes each `vega` node from its grid cell and lists it with its sources; grid items are in panel order. */
const planVegaPanels = (
  body: readonly unknown[],
  panelIds: readonly string[],
  runtimeFor: (index: string) => Record<string, unknown> | undefined
): PlannedVegaPanel[] =>
  (body as Array<{ type: string; items?: GridItem[] }>).flatMap((container, bodyIndex) =>
    container.type !== 'dashboardGrid'
      ? []
      : (container.items ?? []).flatMap((item, itemIndex) => {
          if (item.node.type !== 'vega') {
            return [];
          }
          item.node.width = Math.max(160, item.w * KIBANA_COLUMN_PX);
          item.node.height = Math.max(120, item.h * KIBANA_ROW_PX - 24);
          return [
            {
              panelId: panelIds[itemIndex] ?? `panel-${itemIndex}`,
              specPath: ['body', bodyIndex, 'items', itemIndex, 'node'],
              sources: vegaSources(item.node.spec ?? {}).map((source) => {
                const runtimeMappings = runtimeFor(source.url.index);
                return runtimeMappings ? { ...source, runtimeMappings } : source;
              }),
            },
          ];
        })
  );

const gridItemCount = (body: readonly unknown[]): number =>
  (body as Array<{ type: string; items?: unknown[] }>).reduce(
    (count, node) => count + (node.type === 'dashboardGrid' ? node.items?.length ?? 0 : 1),
    0
  );

/** One node per dashboard panel, `unsupported` ones included; a valid composition missing panels is the failure. */
export const checkPanelCount = (
  dashboardId: string,
  panels: number,
  body: readonly unknown[]
): void => {
  const nodes = gridItemCount(body);
  if (nodes !== panels) {
    throw new Error(
      `dashboard ${dashboardId} has ${panels} panels but the composition has ${nodes} nodes`
    );
  }
};

/** Kibana date math, e.g. `now-7d`; replaces the saved range, which lowering bakes into every query. */
export interface TimeRange {
  from: string;
  to: string;
}

const absoluteRange = ({ from, to }: TimeRange, now: number): TimeRange => {
  const [fromMs, toMs] = [resolveInstantMs(from, now), resolveInstantMs(to, now)];
  return fromMs === undefined || toMs === undefined
    ? { from, to }
    : { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
};

/** Export NDJSON → planned dashboard. Throws when a panel goes missing between the export and the plan. */
export const planDashboard = (
  ndjson: string,
  dashboardId: string,
  {
    timeRange,
    now,
    panelTimeRanges = true,
    dashboardContext = 'esql',
  }: {
    timeRange?: TimeRange;
    /** Pins every relative range, the dashboard's and each panel's, to absolute times at this instant. */
    now?: number;
    panelTimeRanges?: boolean;
    /**
     * `esql` (default) writes the dashboard's query and filters into each panel's ES|QL, where the translator can.
     * `dsl` leaves them out, for a host that sends them as the request's DSL `filter`, as Kibana does.
     */
    dashboardContext?: 'esql' | 'dsl';
  } = {}
): PlannedDashboard => {
  const envelopes = parseSavedObjectNdjson(ndjson);
  const saved = envelopes.find(({ type, id }) => type === 'dashboard' && id === dashboardId);
  if (!saved) {
    throw new Error(`dashboard ${dashboardId} is not in the export`);
  }
  const pin = (range: TimeRange): TimeRange =>
    now === undefined ? range : absoluteRange(range, now);
  const savedAttributes = saved.attributes as {
    timeRestore?: boolean;
    timeFrom?: string;
    timeTo?: string;
  };
  const requested =
    timeRange ??
    (savedAttributes.timeRestore && savedAttributes.timeFrom && savedAttributes.timeTo
      ? { from: savedAttributes.timeFrom, to: savedAttributes.timeTo }
      : undefined);
  const range = requested && pin(requested);
  const dashboard = range
    ? {
        ...saved,
        attributes: {
          ...saved.attributes,
          timeRestore: true,
          timeFrom: range.from,
          timeTo: range.to,
        },
      }
    : saved;
  const index = new Map(envelopes.map((envelope) => [`${envelope.type}:${envelope.id}`, envelope]));
  const titleOf = (id: string, type: string) =>
    (index.get(`${type}:${id}`)?.attributes as { title?: string } | undefined)?.title;
  const dataView = (id: string, type: string) =>
    index.get(`${type}:${id}`)?.attributes as
      | { timeFieldName?: string; fieldFormatMap?: string; fieldAttrs?: string }
      | undefined;
  const { dashboard: lowered, diagnostics } = fromKibanaDashboardSavedObject(dashboard, {
    resolvePanelEnvelope: ({ type, id }) => index.get(`${type}:${id}`),
    resolveReferenceTitle: (_name, id, type) => titleOf(id, type),
    resolveDataViewTimeField: (_name, id, type) => dataView(id, type)?.timeFieldName,
    // A field's custom label, as the data view's field list names it.
    resolveDataViewFieldLabels: (_name, id, type) => {
      const attrs = dataView(id, type)?.fieldAttrs;
      if (!attrs) return undefined;
      const labels = Object.entries(
        JSON.parse(attrs) as Record<string, { customLabel?: string }>
      ).flatMap(([field, { customLabel }]) => (customLabel ? [[field, customLabel] as const] : []));
      return labels.length ? Object.fromEntries(labels) : undefined;
    },
    resolveDataViewFieldFormats: (_name, id, type) => {
      const map = dataView(id, type)?.fieldFormatMap;
      return map ? (JSON.parse(map) as ReturnType<NonNullable<FieldFormatsResolver>>) : undefined;
    },
  });
  if (!lowered) {
    throw new Error(`dashboard ${dashboardId} did not lower: ${JSON.stringify(diagnostics)}`);
  }
  const plan = planAdaptiveDashboard(
    dashboardContext === 'dsl' ? { ...lowered, filters: [] } : lowered,
    { layout: 'grid' }
  );

  const attributes = dashboard.attributes as { title?: string; panelsJSON?: string };
  const panelJson = JSON.parse(attributes.panelsJSON ?? '[]') as DashboardPanelJson[];
  checkPanelCount(dashboardId, panelJson.length, plan.spec.body);

  // By-reference panels resolve to their saved object; by-value panels carry their attributes inline.
  const lensByPanelId = new Map(
    panelJson.map(({ panelIndex, panelRefName, embeddableConfig }) => {
      const reference = dashboard.references?.find(({ name }) => name === panelRefName);
      const byReference = reference && index.get(`${reference.type}:${reference.id}`);
      const byValue = embeddableConfig?.attributes && {
        id: undefined,
        attributes: embeddableConfig.attributes,
      };
      return [panelIndex, byReference ?? byValue] as const;
    })
  );
  const byValueQueryPrefix = `${dashboardId}:panel:`;
  const panels = plan.bindings.map((binding): PlannedPanel => {
    const query = plan.queries.find(({ id }) => id === binding.queryId);
    if (!query) {
      throw new Error(`binding ${binding.queryId} has no query`);
    }
    // The plan keys a by-value panel's query by its panelIndex and a by-reference one by Lens id; a Lens reused across panels would be ambiguous.
    const matches = binding.queryId.startsWith(byValueQueryPrefix)
      ? [...lensByPanelId].filter(
          ([panelIndex]) => panelIndex === binding.queryId.slice(byValueQueryPrefix.length)
        )
      : [...lensByPanelId].filter(([, lens]) => lens?.id === binding.queryId);
    // A saved search's query is keyed by its title, so it falls back to the grid slot it was planned into.
    const [, , , gridIndex] = binding.specPath;
    const slot = typeof gridIndex === 'number' ? panelJson[gridIndex]?.panelIndex : undefined;
    const match =
      matches.length === 1
        ? matches[0]
        : slot === undefined
        ? undefined
        : ([slot, lensByPanelId.get(slot)] as const);
    if (!match) {
      throw new Error(`query ${binding.queryId} matches ${matches.length} panels`);
    }
    const [panelId, lens] = match;
    const { gridData, embeddableConfig } =
      panelJson.find(({ panelIndex }) => panelIndex === panelId) ?? {};
    return {
      panelId,
      queryId: binding.queryId,
      binding,
      query,
      // Lens state names fields exactly where it has them; the query covers ES|QL panels and the rest.
      dimensions: {
        ...dimensionsFromEsql(query.query.esql),
        ...(lens ? dimensionsFor(lens, query.query.esql) : {}),
      },
      ...(lens ? { lens: lens.attributes as Record<string, unknown> } : {}),
      ...(gridData ? { grid: { x: gridData.x, y: gridData.y, w: gridData.w, h: gridData.h } } : {}),
      ...(embeddableConfig?.hidePanelTitles ? { hidePanelTitles: true } : {}),
    };
  });

  // A panel with its own time range takes its query from a plan of the whole dashboard over that range.
  const savedRange = lowered.timeRange;
  const unresolvedPanelTimeRanges: Record<string, TimeRange> = {};
  if (panelTimeRanges) {
    for (const panel of panels) {
      const authored = panelJson.find(({ panelIndex }) => panelIndex === panel.panelId)
        ?.embeddableConfig?.timeRange;
      const own = authored && pin(authored);
      if (!own || (savedRange && own.from === savedRange.from && own.to === savedRange.to)) {
        continue;
      }
      const replanned = planDashboard(ndjson, dashboardId, {
        timeRange: own,
        panelTimeRanges: false,
        dashboardContext,
      });
      const resolved = !replanned.diagnostics.some(
        (diagnostic) =>
          (diagnostic as { code?: string }).code === 'lens.formBased.time-range-unrecognized'
      );
      const counterpart = replanned.panels.find(({ panelId }) => panelId === panel.panelId);
      if (!resolved || !counterpart) {
        unresolvedPanelTimeRanges[panel.panelId] = own;
        continue;
      }
      Object.assign(panel, {
        query: counterpart.query,
        binding: counterpart.binding,
        dimensions: counterpart.dimensions,
        timeRange: own,
        auxiliaryEsql: replanned.auxiliaryEsql,
      });
    }
  }
  const runtimeFor = (title: string) => {
    const fields = envelopes
      .filter(
        ({ type, attributes: view }) =>
          type === 'index-pattern' && (view as { title?: string }).title === title
      )
      .map(({ attributes: view }) => (view as { runtimeFieldMap?: unknown }).runtimeFieldMap)
      .map((map) => (typeof map === 'string' ? (JSON.parse(map) as unknown) : map))
      .filter((map): map is Record<string, unknown> => typeof map === 'object' && map !== null);
    return fields.length > 0
      ? (Object.assign({}, ...fields) as Record<string, unknown>)
      : undefined;
  };
  const vegaPanels = planVegaPanels(
    plan.spec.body,
    panelJson.map(({ panelIndex }) => panelIndex),
    runtimeFor
  );
  return {
    title: attributes.title ?? dashboardId,
    spec: plan.spec,
    panels,
    vegaPanels,
    ...(lowered.timeRange ? { timeRange: lowered.timeRange } : {}),
    unresolvedPanelTimeRanges,
    auxiliaryEsql: Object.fromEntries(
      plan.queries
        .filter(({ id }) => !plan.bindings.some(({ queryId }) => queryId === id))
        .map(({ id, query }) => [id, query.esql])
    ),
    diagnostics: [...diagnostics, ...plan.diagnostics],
  };
};
