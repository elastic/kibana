/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The dashboard's context as Kibana applies it to every panel: its saved query and filters, its controls' filters,
// its ES|QL control variables, and its time slider's window. Each piece follows Kibana's own implementation:
// - stored controls: `dashboard` `transform_pinned_panels_out.ts` (`pinned_panels`, or legacy `controlGroupInput`)
//   and `embeddable` `transformType` for legacy control types;
// - control filters: `controls` `options_list_control/utils/filter_utils.ts` and `range_slider/utils/filter_utils.ts`;
// - ES|QL variables: `controls` `esql_control_manager.ts` `getEsqlVariable` and `castESQLValue`, sent through
//   `@kbn/esql-utils` `getNamedParams`;
// - the time slider: `controls` `timeslider_control` (the window as fractions of the dashboard's time range);
// - one DSL for every query: `@kbn/es-query` `buildEsQuery`, which Kibana sends as the ES|QL request's `filter`,
//   uses for Vega's `%context%` and `%dashboard_context-*%`, and applies to Maps' sources.
// Anything else a control can be is reported by name in `diagnostics`, never dropped silently.

import {
  type BoolQuery,
  buildEsQuery,
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
  type DataViewBase,
  type DataViewFieldBase,
  type EsQueryConfig,
  type Filter,
  type Query,
} from '@kbn/es-query';

import type { TimeRange } from './dashboard';

/** A pinned control in the dashboard API's as-code shape. */
export interface PinnedControl {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

/** A data view and one of its fields, as the server's data views service resolves them. */
export interface ResolvedField {
  dataView: DataViewBase;
  field: DataViewFieldBase;
}

export type ResolveField = (
  dataViewId: string,
  fieldName: string
) => Promise<ResolvedField | undefined>;

/** An ES|QL control's variable, as `@kbn/esql-types` `ESQLControlVariable`. */
export interface EsqlVariable {
  key: string;
  value: string | number | Array<string | number>;
  type: string;
}

export interface DashboardContext {
  /** Every query's DSL filter: the saved query and filters, and the controls' filters. */
  bool: BoolQuery;
  /** The time slider's window, when it narrows the dashboard's time range. */
  timeslice?: TimeRange;
  variables: EsqlVariable[];
  diagnostics: string[];
}

/** `embeddable` `transformType` for the legacy control types. */
const LEGACY_TYPES: Record<string, string> = {
  optionsListControl: 'options_list_control',
  rangeSliderControl: 'range_slider_control',
  timeSlider: 'time_slider_control',
  esqlControl: 'esql_control',
};

/** `controls-schemas` `legacy_types.ts`: the legacy `explicitInput` keys and their as-code names. */
const LEGACY_KEYS: Record<string, string> = {
  fieldName: 'field_name',
  dataViewId: 'data_view_id',
  selectedOptions: 'selected_options',
  existsSelected: 'exists_selected',
  singleSelect: 'single_select',
  variableName: 'variable_name',
  variableType: 'variable_type',
  controlType: 'control_type',
  availableOptions: 'available_options',
  esqlQuery: 'esql_query',
  timesliceStartAsPercentageOfTimeRange: 'start_percentage_of_time_range',
  timesliceEndAsPercentageOfTimeRange: 'end_percentage_of_time_range',
  isAnchored: 'is_anchored',
  searchTechnique: 'search_technique',
};

const asCode = (config: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(config).map(([key, value]) => [LEGACY_KEYS[key] ?? key, value])
  );

interface Reference {
  name: string;
  type: string;
  id: string;
}

/**
 * The dashboard's pinned controls in as-code shape, from `pinned_panels` (9.4 and later) or the legacy
 * `controlGroupInput.panelsJSON`, in display order. A data view extracted to a reference is put back.
 */
export const readPinnedControls = (
  attributes: Record<string, unknown>,
  references: readonly Reference[] = []
): PinnedControl[] => {
  const pinned = (attributes.pinned_panels as { panels?: Record<string, unknown> } | undefined)
    ?.panels;
  const legacyJson = (attributes.controlGroupInput as { panelsJSON?: string } | undefined)
    ?.panelsJSON;
  const stored = (pinned ?? (legacyJson ? JSON.parse(legacyJson) : {})) as Record<
    string,
    {
      type: string;
      order?: number;
      config?: Record<string, unknown>;
      explicitInput?: Record<string, unknown>;
    }
  >;
  return Object.entries(stored)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
    .map(([id, { type, config, explicitInput }]) => {
      const state = asCode(config ?? explicitInput ?? {});
      if (state.data_view_id === undefined) {
        const reference = references.find(
          ({ name, type: refType }) =>
            refType === 'index-pattern' &&
            (name.startsWith(`controlGroup_${id}:`) || name.startsWith(`${id}:`))
        );
        if (reference) {
          state.data_view_id = reference.id;
        }
      }
      return { id, type: LEGACY_TYPES[type] ?? type, config: state };
    });
};

/** Current controls replace the saved ones by id; a control only on screen is added. */
export const withCurrentControls = (
  saved: readonly PinnedControl[],
  current: readonly PinnedControl[] | undefined
): PinnedControl[] => {
  if (!current) {
    return [...saved];
  }
  const byId = new Map(current.map((control) => [control.id, control]));
  return [
    ...saved.map((control) => byId.get(control.id) ?? control),
    ...current.filter(({ id }) => !saved.some((control) => control.id === id)),
  ];
};

const strings = (value: unknown): Array<string | number> =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string' || typeof v === 'number') : [];

/** `options_list_control/utils/filter_utils.ts` `buildFilter`. */
const optionsListFilter = (
  { dataView, field }: ResolvedField,
  id: string,
  config: Record<string, unknown>
): Filter | undefined => {
  const selected = strings(config.selected_options);
  let filter: Filter | undefined;
  if (config.exists_selected) {
    filter = buildExistsFilter(field, dataView);
  } else if (selected.length > 0) {
    filter =
      selected.length === 1
        ? buildPhraseFilter(field, selected[0], dataView)
        : buildPhrasesFilter(field, selected, dataView);
  }
  if (filter) {
    filter.meta.key = field.name;
    if (config.exclude) filter.meta.negate = true;
    filter.meta.controlledBy = id;
  }
  return filter;
};

/** `range_slider/utils/filter_utils.ts` `buildFilter`: a missing bound is unbounded. */
const rangeSliderFilter = (
  { dataView, field }: ResolvedField,
  id: string,
  config: Record<string, unknown>
): Filter | undefined => {
  const value = config.value as [string, string] | undefined;
  const gte = parseFloat(value?.[0] ?? '');
  const lte = parseFloat(value?.[1] ?? '');
  if (!value || (Number.isNaN(gte) && Number.isNaN(lte))) {
    return undefined;
  }
  const params = {
    gte: Number.isNaN(gte) ? -Infinity : gte,
    lte: Number.isNaN(lte) ? Infinity : lte,
  };
  const filter = buildRangeFilter(field, params, dataView);
  filter.meta.key = field.name;
  filter.meta.type = 'range';
  filter.meta.params = params;
  filter.meta.controlledBy = id;
  return filter;
};

/** `esql_type_utils.ts` `castESQLValue` without a column type: numbers where they parse. */
const castEsqlValue = (value: string | number): string | number =>
  typeof value === 'number' || Number.isNaN(Number(value)) ? value : Number(value);

/** `esql_control_manager.ts` `getEsqlVariable`; single select defaults to `true`, as the schema does. */
const esqlVariable = (config: Record<string, unknown>): EsqlVariable | undefined => {
  const key = config.variable_name;
  if (typeof key !== 'string' || key.length === 0) {
    return undefined;
  }
  const selected = strings(config.selected_options);
  const single = config.single_select !== false;
  return {
    key,
    value: single
      ? selected[0] !== undefined
        ? castEsqlValue(selected[0])
        : ''
      : selected.map(castEsqlValue),
    type: typeof config.variable_type === 'string' ? config.variable_type : 'values',
  };
};

/** The time slider's window: its fractions of the dashboard's absolute time range. */
const timesliceOf = (config: Record<string, unknown>, range: TimeRange | undefined) => {
  // Anchored, the window starts at the beginning of the range and only its end moves.
  const start = config.is_anchored ? 0 : Number(config.start_percentage_of_time_range ?? 0);
  const end = Number(config.end_percentage_of_time_range ?? 1);
  const [from, to] = [Date.parse(range?.from ?? ''), Date.parse(range?.to ?? '')];
  if (Number.isNaN(from) || Number.isNaN(to) || (start <= 0 && end >= 1)) {
    return undefined;
  }
  const at = (fraction: number) =>
    new Date(from + Math.min(1, Math.max(0, fraction)) * (to - from));
  return { from: at(start).toISOString(), to: at(end).toISOString() };
};

/** The saved dashboard's `searchSourceJSON`: its query, and its filters with their data views put back. */
export const readSavedContext = (
  attributes: Record<string, unknown>,
  references: readonly Reference[] = []
): { query?: Query; filters: Filter[] } => {
  const json = (attributes.kibanaSavedObjectMeta as { searchSourceJSON?: string } | undefined)
    ?.searchSourceJSON;
  if (!json) {
    return { filters: [] };
  }
  const source = JSON.parse(json) as { query?: Query; filter?: Filter[] };
  const filters = (source.filter ?? []).map((filter) => {
    const indexRefName = (filter.meta as { indexRefName?: string } | undefined)?.indexRefName;
    const reference = indexRefName && references.find(({ name }) => name === indexRefName);
    return reference ? { ...filter, meta: { ...filter.meta, index: reference.id } } : filter;
  });
  return { ...(source.query ? { query: source.query } : {}), filters };
};

const ES_QUERY_CONFIG: EsQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: { analyze_wildcard: true },
  ignoreFilterIfFieldNotInIndex: false,
};

/**
 * The context every panel's queries run in. `resolveField` finds a control's data view and field, as Kibana's
 * controls do; a control whose field doesn't resolve applies no filter, as in Kibana, and is named.
 */
export const buildDashboardContext = async ({
  saved,
  controls,
  timeRange,
  resolveField,
  config = {},
}: {
  saved: { query?: Query; filters: Filter[] };
  controls: readonly PinnedControl[];
  /** The dashboard's absolute time range, for the time slider. */
  timeRange?: TimeRange;
  resolveField?: ResolveField;
  config?: Partial<EsQueryConfig>;
}): Promise<DashboardContext> => {
  const diagnostics: string[] = [];
  const filters: Filter[] = [...saved.filters];
  const variables: EsqlVariable[] = [];
  let timeslice: TimeRange | undefined;
  for (const { id, type, config: state } of controls) {
    const label = `${type} ${String(state.title ?? state.field_name ?? state.variable_name ?? id)}`;
    if (type === 'esql_control') {
      const variable = esqlVariable(state);
      if (variable) variables.push(variable);
      continue;
    }
    if (type === 'time_slider_control') {
      timeslice = timesliceOf(state, timeRange) ?? timeslice;
      continue;
    }
    if (type !== 'options_list_control' && type !== 'range_slider_control') {
      diagnostics.push(`${label}: no lowering for this control type; its selection isn't applied`);
      continue;
    }
    const dataViewId = state.data_view_id;
    const fieldName = state.field_name;
    if (typeof dataViewId !== 'string' || typeof fieldName !== 'string') {
      diagnostics.push(`${label}: no data view or field; nothing applied`);
      continue;
    }
    const resolved = resolveField ? await resolveField(dataViewId, fieldName) : undefined;
    if (!resolved) {
      diagnostics.push(
        `${label}: field ${fieldName} not found in data view ${dataViewId}; nothing applied`
      );
      continue;
    }
    const filter =
      type === 'options_list_control'
        ? optionsListFilter(resolved, id, state)
        : rangeSliderFilter(resolved, id, state);
    if (filter) filters.push(filter);
  }
  const bool = buildEsQuery(undefined, saved.query ? [saved.query] : [], filters, {
    ...ES_QUERY_CONFIG,
    ...config,
  }).bool;
  return { bool, ...(timeslice ? { timeslice } : {}), variables, diagnostics };
};
