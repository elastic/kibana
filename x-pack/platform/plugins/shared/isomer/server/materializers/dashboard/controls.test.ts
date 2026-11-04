/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DashboardControl } from './controls';
import { controlEsqlVariables, controlTimeslice, resolveControlFilters } from './controls';

// Expected values come from the controls plugin's own tests: its options list, range slider, ES|QL
// control and time slider factories' tests in `src/platform/plugins/shared/controls/public`.

const dataView = createStubDataView({
  spec: {
    id: 'myDataViewId',
    title: 'logstash-*',
    timeFieldName: '@timestamp',
    fields: {
      myFieldName: {
        name: 'myFieldName',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
      },
      bytes: {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        aggregatable: true,
        searchable: true,
      },
    },
  },
});

const getDataView = async (id: string): Promise<DataView | undefined> =>
  id === 'myDataViewId' ? dataView : undefined;

const optionsList = (config: Record<string, unknown>, extra: Partial<DashboardControl> = {}) => ({
  id: 'myControl1',
  type: 'options_list_control',
  config: { data_view_id: 'myDataViewId', field_name: 'myFieldName', ...config },
  ...extra,
});

describe('resolveControlFilters', () => {
  it('builds a phrases filter for several selected options', async () => {
    const { controlFilters } = await resolveControlFilters(
      [optionsList({ selected_options: ['cool', 'test'] })],
      { getDataView }
    );
    expect(controlFilters).toEqual([
      {
        filter: {
          meta: {
            controlledBy: 'myControl1',
            index: 'myDataViewId',
            key: 'myFieldName',
            params: ['cool', 'test'],
            type: 'phrases',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                { match_phrase: { myFieldName: 'cool' } },
                { match_phrase: { myFieldName: 'test' } },
              ],
            },
          },
        },
      },
    ]);
  });

  it('builds a phrase filter for one selected option', async () => {
    const { controlFilters } = await resolveControlFilters(
      [optionsList({ selected_options: ['woof'] })],
      { getDataView }
    );
    expect(controlFilters).toEqual([
      {
        filter: {
          meta: { controlledBy: 'myControl1', index: 'myDataViewId', key: 'myFieldName' },
          query: { match_phrase: { myFieldName: 'woof' } },
        },
      },
    ]);
  });

  it('builds a negated exists filter when exists and exclude are selected', async () => {
    const { controlFilters } = await resolveControlFilters(
      [optionsList({ exists_selected: true, exclude: true })],
      { getDataView }
    );
    expect(controlFilters).toEqual([
      {
        filter: {
          meta: {
            controlledBy: 'myControl1',
            index: 'myDataViewId',
            key: 'myFieldName',
            negate: true,
          },
          query: { exists: { field: 'myFieldName' } },
        },
      },
    ]);
  });

  it('builds a range filter for a range slider, scoped to its section', async () => {
    const { controlFilters } = await resolveControlFilters(
      [
        {
          id: 'myControl1',
          type: 'range_slider_control',
          config: { data_view_id: 'myDataViewId', field_name: 'bytes', value: ['5', '10'] },
          sectionId: 'section-a',
        },
      ],
      { getDataView }
    );
    expect(controlFilters).toEqual([
      {
        sectionId: 'section-a',
        filter: {
          meta: {
            controlledBy: 'myControl1',
            field: 'bytes',
            group: 'section-a',
            index: 'myDataViewId',
            key: 'bytes',
            params: { gte: 5, lte: 10 },
            type: 'range',
          },
          query: { range: { bytes: { gte: 5, lte: 10 } } },
        },
      },
    ]);
  });

  it('applies nothing for controls without a selection, data view or field', async () => {
    await expect(
      resolveControlFilters(
        [
          optionsList({ selected_options: [] }),
          optionsList({ selected_options: ['a'], data_view_id: 'notGonnaFindMeDataView' }),
          optionsList({ selected_options: ['a'], field_name: 'missing' }),
          {
            type: 'range_slider_control',
            config: { data_view_id: 'myDataViewId', field_name: 'bytes' },
          },
        ],
        { getDataView }
      )
    ).resolves.toEqual({ controlFilters: [], unappliedControls: [] });
  });

  it('lists controls whose options come from ES|QL as unapplied', async () => {
    await expect(
      resolveControlFilters(
        [
          {
            id: 'esql-sourced',
            type: 'options_list_control',
            title: 'Hosts',
            sectionId: 'section-a',
            config: {
              values_source: 'esql',
              esql_query: 'FROM logs | STATS BY host',
              selected_options: ['a'],
            },
          },
        ],
        { getDataView }
      )
    ).resolves.toEqual({
      controlFilters: [],
      unappliedControls: [{ title: 'Hosts', sectionId: 'section-a' }],
    });
  });
});

describe('controlEsqlVariables', () => {
  const esqlControl = (config: Record<string, unknown>): DashboardControl => ({
    id: 'myESQLControl',
    type: 'esql_control',
    config: {
      variable_name: 'myVariable',
      variable_type: 'values',
      control_type: 'STATIC_VALUES',
      available_options: ['option1', 'option2', 'option3'],
      ...config,
    },
  });

  it('publishes the first selection for a single-select control', () => {
    expect(controlEsqlVariables([esqlControl({ selected_options: ['option1'] })])).toEqual([
      {
        key: 'myVariable',
        value: 'option1',
        type: 'values',
        meta: { controlledBy: 'myESQLControl' },
      },
    ]);
  });

  it('publishes every selection for a multi-select control', () => {
    expect(
      controlEsqlVariables([
        esqlControl({ selected_options: ['option1', 'option2'], single_select: false }),
      ])
    ).toEqual([
      {
        key: 'myVariable',
        value: ['option1', 'option2'],
        type: 'values',
        meta: { controlledBy: 'myESQLControl' },
      },
    ]);
  });
});

describe('controlTimeslice', () => {
  const timeSlider = (config: Record<string, unknown> = {}): DashboardControl => ({
    type: 'time_slider_control',
    config,
  });
  const day = { from: '2024-06-09T00:00:00.000Z', to: '2024-06-10T00:00:00.000Z' };

  it('covers the whole range by default', () => {
    expect(controlTimeslice([timeSlider()], day)).toEqual({ ...day, mode: 'absolute' });
  });

  it('narrows to the selected fractions of the range', () => {
    expect(
      controlTimeslice(
        [timeSlider({ start_percentage_of_time_range: 0.25, end_percentage_of_time_range: 0.5 })],
        day
      )
    ).toEqual({
      from: '2024-06-09T06:00:00.000Z',
      to: '2024-06-09T12:00:00.000Z',
      mode: 'absolute',
    });
  });

  it('keeps the fractions within a shorter range', () => {
    expect(
      controlTimeslice(
        [timeSlider({ start_percentage_of_time_range: 0.25, end_percentage_of_time_range: 0.5 })],
        { from: '2024-06-08T00:00:00.000Z', to: '2024-06-08T01:00:00.000Z' }
      )
    ).toEqual({
      from: '2024-06-08T00:15:00.000Z',
      to: '2024-06-08T00:30:00.000Z',
      mode: 'absolute',
    });
  });

  it('is absent without a time slider', () => {
    expect(controlTimeslice([], day)).toBeUndefined();
  });
});
