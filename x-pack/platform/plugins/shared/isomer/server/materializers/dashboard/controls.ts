/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ControlValuesSource,
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type {
  OptionsListESQLControlState,
  PinnedControlState,
  TimeSliderControlState,
} from '@kbn/controls-schemas';
import {
  optionsListDSLControlSchema,
  optionsListESQLControlSchema,
  rangeSliderControlSchema,
  timeSliderControlSchema,
} from '@kbn/controls-schemas';
import { calcAutoIntervalNear } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, RangeFilterParams, TimeRange } from '@kbn/es-query';
import {
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
} from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import { castESQLValue } from '@kbn/esql-utils';
import type { ControlFilter, DashboardConfig, UnappliedControl } from './config';
import { isDashboardSection } from './config';
import { CONTROL_PANEL_TYPES } from './panel_types';

/** A control on the dashboard: pinned, or a panel in the grid, with its section when it has one. */
export interface DashboardControl {
  id?: string;
  type: string;
  config: unknown;
  title?: string;
  sectionId?: string;
}

/** The section a panel is in, for scoping section controls, when the section has no ID of its own. */
export const sectionKey = (id: string | undefined, index: number): string =>
  id ?? `section-${index}`;

/** Every control on the dashboard, pinned ones first, then grid panels in reading order of the state. */
export const dashboardControls = ({ state }: DashboardConfig): DashboardControl[] => {
  const pinned = state.pinned_panels.map(
    ({ id, type, config }: PinnedControlState): DashboardControl => ({
      id,
      type,
      config,
      title: 'title' in config ? config.title : undefined,
    })
  );
  const inGrid: DashboardControl[] = [];
  let sectionIndex = 0;
  for (const panel of state.panels) {
    if (isDashboardSection(panel)) {
      const sectionId = sectionKey(panel.id, sectionIndex++);
      for (const { id, type, config } of panel.panels) {
        if (CONTROL_PANEL_TYPES.has(type)) {
          inGrid.push({ id, type, config, title: titleOf(config), sectionId });
        }
      }
    } else if (CONTROL_PANEL_TYPES.has(panel.type)) {
      inGrid.push({
        id: panel.id,
        type: panel.type,
        config: panel.config,
        title: titleOf(panel.config),
      });
    }
  }
  return [...pinned, ...inGrid];
};

const titleOf = (config: Record<string, unknown>): string | undefined =>
  typeof config.title === 'string' ? config.title : undefined;

const withControlMeta = (filter: Filter, { id, sectionId }: DashboardControl): Filter => {
  if (id) {
    filter.meta.controlledBy = id;
  }
  if (sectionId) {
    filter.meta.group = sectionId;
  }
  return filter;
};

/** An options list's filter, built as the controls plugin's options list builds it. */
const optionsListFilter = (
  control: DashboardControl,
  dataView: DataView,
  fieldName: string,
  {
    exists_selected: existsSelected,
    selected_options: selectedOptions,
    exclude,
  }: { exists_selected?: boolean; selected_options?: Array<string | number>; exclude?: boolean }
): Filter | undefined => {
  const field = dataView.getFieldByName(fieldName);
  if (!field) {
    return undefined;
  }
  let filter: Filter | undefined;
  if (existsSelected) {
    filter = buildExistsFilter(field, dataView);
  } else if (selectedOptions && selectedOptions.length > 0) {
    filter =
      selectedOptions.length === 1
        ? buildPhraseFilter(field, selectedOptions[0], dataView)
        : buildPhrasesFilter(field, selectedOptions, dataView);
  }
  if (!filter) {
    return undefined;
  }
  filter.meta.key = field.name;
  if (exclude) {
    filter.meta.negate = true;
  }
  return withControlMeta(filter, control);
};

/** A range slider's filter, built as the controls plugin's range slider builds it. */
const rangeSliderFilter = (
  control: DashboardControl,
  dataView: DataView,
  fieldName: string,
  value: string[] | undefined
): Filter | undefined => {
  const field = dataView.getFieldByName(fieldName);
  const gte = parseFloat(value?.[0] ?? '');
  const lte = parseFloat(value?.[1] ?? '');
  if (!value || !field || (isNaN(gte) && isNaN(lte))) {
    return undefined;
  }
  const params = {
    gte: !isNaN(gte) ? gte : -Infinity,
    lte: !isNaN(lte) ? lte : Infinity,
  } as RangeFilterParams;
  const filter = buildRangeFilter(field, params, dataView);
  filter.meta.key = fieldName;
  filter.meta.type = 'range';
  filter.meta.params = params;
  return withControlMeta(filter, control);
};

/** Whether a data control has a selection that filters. */
const hasSelection = (control: DashboardControl): boolean => {
  if (control.type === OPTIONS_LIST_CONTROL) {
    const { exists_selected: existsSelected, selected_options: selectedOptions } =
      optionsListDSLControlSchema.parse(control.config);
    return Boolean(existsSelected) || selectedOptions.length > 0;
  }
  if (control.type === RANGE_SLIDER_CONTROL) {
    const { value } = rangeSliderControlSchema.parse(control.config);
    return Boolean(value) && value?.some((bound) => !isNaN(parseFloat(bound))) === true;
  }
  return false;
};

export interface ControlFilterServices {
  /** A data view by ID, or `undefined` when the user can't load it. */
  getDataView: (id: string) => Promise<DataView | undefined>;
}

/**
 * The filters a dashboard's options list and range slider controls apply, as the controls plugin
 * builds them. A control whose data view or field is missing applies none, as in Kibana. Controls
 * whose options come from an ES|QL query need that query run to know their field, so they're
 * listed as unapplied instead.
 */
export const resolveControlFilters = async (
  controls: DashboardControl[],
  { getDataView }: ControlFilterServices
): Promise<{ controlFilters: ControlFilter[]; unappliedControls: UnappliedControl[] }> => {
  const dataControls = controls.filter(
    (control) =>
      (control.type === OPTIONS_LIST_CONTROL || control.type === RANGE_SLIDER_CONTROL) &&
      hasSelection(control)
  );
  const results = await Promise.all(
    dataControls.map(async (control) => {
      const parsed =
        control.type === OPTIONS_LIST_CONTROL
          ? optionsListDSLControlSchema.parse(control.config)
          : rangeSliderControlSchema.parse(control.config);
      if (parsed.values_source === ControlValuesSource.ESQL) {
        return { unapplied: control };
      }
      const dataView = await getDataView(parsed.data_view_id);
      if (!dataView) {
        return {};
      }
      const filter =
        'step' in parsed
          ? rangeSliderFilter(control, dataView, parsed.field_name, parsed.value)
          : optionsListFilter(control, dataView, parsed.field_name, parsed);
      return filter ? { filter: { filter, sectionId: control.sectionId } } : {};
    })
  );
  return {
    controlFilters: results.flatMap(({ filter }) => (filter ? [filter] : [])),
    unappliedControls: results.flatMap(({ unapplied }) =>
      unapplied
        ? [
            {
              title: unapplied.title || unapplied.type,
              ...(unapplied.sectionId ? { sectionId: unapplied.sectionId } : {}),
            },
          ]
        : []
    ),
  };
};

const esqlVariableTypes: Readonly<
  Record<OptionsListESQLControlState['variable_type'], ESQLVariableType>
> = {
  fields: ESQLVariableType.FIELDS,
  values: ESQLVariableType.VALUES,
  functions: ESQLVariableType.FUNCTIONS,
  time_literal: ESQLVariableType.TIME_LITERAL,
  multi_values: ESQLVariableType.MULTI_VALUES,
};

/** An ES|QL control's variable, as the controls plugin publishes it. */
const esqlVariable = (control: DashboardControl): ESQLControlVariable => {
  const {
    selected_options: selectedOptions,
    single_select: singleSelect,
    variable_name: variableName,
    variable_type: variableType,
  }: OptionsListESQLControlState = optionsListESQLControlSchema.parse(control.config);
  // The controls plugin casts by the values query's column type once it has run the query; without
  // running it, values cast as they do for static options.
  const value = singleSelect
    ? selectedOptions[0] !== undefined
      ? castESQLValue(selectedOptions[0])
      : ''
    : selectedOptions.map((option) => castESQLValue(option));
  return {
    key: variableName,
    value,
    type: esqlVariableTypes[variableType],
    meta: {
      ...(control.id ? { controlledBy: control.id } : {}),
      ...(control.sectionId ? { group: control.sectionId } : {}),
    },
  };
};

/** The ES|QL variables a dashboard's ES|QL controls publish, in control order. */
export const controlEsqlVariables = (controls: DashboardControl[]): ESQLControlVariable[] =>
  controls.filter(({ type }) => type === ESQL_CONTROL).map(esqlVariable);

const MAX_TICKS = 20;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365 * DAY;

/** The time slider's tick interval for a range, as the controls plugin chooses it. */
const tickInterval = (duration: number): number => {
  let interval = calcAutoIntervalNear(MAX_TICKS, duration).asMilliseconds();
  const steps = duration / interval;
  if (steps > MAX_TICKS) {
    interval = interval * Math.ceil(steps / MAX_TICKS);
  } else if (steps < MAX_TICKS / 2) {
    interval = interval / 2;
  }
  return interval;
};

/** The time slider's step for a range, from the gap between its first two ticks. */
const stepSize = (min: number, max: number): number => {
  const interval = tickInterval(max - min);
  const first = Math.ceil(min / interval) * interval;
  if (first + interval > max) {
    return 1;
  }
  if (interval >= 2 * YEAR) {
    return YEAR;
  }
  if (interval >= 2 * DAY) {
    return DAY;
  }
  if (interval >= 2 * HOUR) {
    return HOUR;
  }
  if (interval >= 2 * MINUTE) {
    return MINUTE;
  }
  if (interval >= 2 * SECOND) {
    return SECOND;
  }
  return 1;
};

const roundDown = (value: number, step: number) => value - (value % step);
const roundUp = (value: number, step: number) => {
  const remainder = value % step;
  return remainder === 0 ? value : value + (step - remainder);
};

/**
 * The time range a dashboard's time slider narrows panels to, as the controls plugin computes its
 * timeslice: the selected fractions of the absolute range, widened to the slider's step.
 */
export const controlTimeslice = (
  controls: DashboardControl[],
  absoluteTimeRange: TimeRange | undefined
): TimeRange | undefined => {
  const control = controls.find(({ type }) => type === TIME_SLIDER_CONTROL);
  if (!control || !absoluteTimeRange) {
    return undefined;
  }
  const {
    start_percentage_of_time_range: start,
    end_percentage_of_time_range: end,
  }: TimeSliderControlState = timeSliderControlSchema.parse(control.config);
  const min = Date.parse(absoluteTimeRange.from);
  const max = Date.parse(absoluteTimeRange.to);
  if (isNaN(min) || isNaN(max) || max <= min) {
    return undefined;
  }
  const step = stepSize(min, max);
  const duration = max - min;
  return {
    from: new Date(roundDown(min + start * duration, step)).toISOString(),
    to: new Date(roundUp(min + end * duration, step)).toISOString(),
    mode: 'absolute',
  };
};
