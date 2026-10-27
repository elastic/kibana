/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

import { corpusObjects } from './corpus.test_helpers';
import {
  buildDashboardContext,
  type PinnedControl,
  readPinnedControls,
  readSavedContext,
  type ResolveField,
  withCurrentControls,
} from './dashboard_context';

const dataView: DataViewBase = { id: 'dv', title: 'kibana_sample_data_flights', fields: [] };
const fieldOf = (name: string, type = 'string'): DataViewFieldBase => ({ name, type });
const resolveField: ResolveField = async (_id, name) => ({
  dataView,
  field: fieldOf(name, name === 'FlightDelayMin' ? 'number' : 'string'),
});

const control = (id: string, type: string, config: Record<string, unknown>): PinnedControl => ({
  id,
  type,
  config: { data_view_id: 'dv', ...config },
});

const contextOf = (controls: PinnedControl[], timeRange?: { from: string; to: string }) =>
  buildDashboardContext({
    saved: { filters: [] },
    controls,
    resolveField,
    ...(timeRange ? { timeRange } : {}),
  });

describe('readPinnedControls', () => {
  it('reads legacy controlGroupInput and puts a referenced data view back', () => {
    const controls = readPinnedControls(
      {
        controlGroupInput: {
          panelsJSON: JSON.stringify({
            b: {
              order: 1,
              type: 'rangeSliderControl',
              explicitInput: { fieldName: 'bytes', value: ['1', '2'] },
            },
            a: {
              order: 0,
              type: 'optionsListControl',
              explicitInput: {
                fieldName: 'OriginCityName',
                selectedOptions: ['Chicago'],
                existsSelected: false,
              },
            },
          }),
        },
      },
      [{ name: 'controlGroup_b:rangeSliderDataView', type: 'index-pattern', id: 'logs' }]
    );
    expect(controls).toEqual([
      {
        id: 'a',
        type: 'options_list_control',
        config: {
          field_name: 'OriginCityName',
          selected_options: ['Chicago'],
          exists_selected: false,
        },
      },
      {
        id: 'b',
        type: 'range_slider_control',
        config: { field_name: 'bytes', value: ['1', '2'], data_view_id: 'logs' },
      },
    ]);
  });

  it('reads 9.4 pinned_panels as they are', () => {
    expect(
      readPinnedControls({
        pinned_panels: {
          panels: {
            t: {
              order: 0,
              type: 'time_slider_control',
              config: { start_percentage_of_time_range: 0.5 },
            },
          },
        },
      })
    ).toEqual([
      { id: 't', type: 'time_slider_control', config: { start_percentage_of_time_range: 0.5 } },
    ]);
  });

  it('lets current controls replace saved ones by id', () => {
    const saved = [control('a', 'options_list_control', { selected_options: [] })];
    const current = [control('a', 'options_list_control', { selected_options: ['Chicago'] })];
    expect(withCurrentControls(saved, current)).toEqual(current);
    expect(withCurrentControls(saved, undefined)).toEqual(saved);
  });
});

describe('buildDashboardContext', () => {
  it('builds Kibana’s options list filters: one, several, excluded, exists', async () => {
    const { bool } = await contextOf([
      control('one', 'options_list_control', {
        field_name: 'Carrier',
        selected_options: ['JetBeats'],
      }),
      control('many', 'options_list_control', { field_name: 'Dest', selected_options: ['A', 'B'] }),
      control('not', 'options_list_control', {
        field_name: 'Origin',
        selected_options: ['C'],
        exclude: true,
      }),
      control('has', 'options_list_control', { field_name: 'Cancelled', exists_selected: true }),
      control('none', 'options_list_control', { field_name: 'Weather', selected_options: [] }),
    ]);
    expect(bool.filter).toEqual([
      { match_phrase: { Carrier: 'JetBeats' } },
      {
        bool: {
          minimum_should_match: 1,
          should: [{ match_phrase: { Dest: 'A' } }, { match_phrase: { Dest: 'B' } }],
        },
      },
      { exists: { field: 'Cancelled' } },
    ]);
    expect(bool.must_not).toEqual([{ match_phrase: { Origin: 'C' } }]);
  });

  it('builds Kibana’s range filter, a missing bound unbounded', async () => {
    const { bool } = await contextOf([
      control('r', 'range_slider_control', { field_name: 'FlightDelayMin', value: ['10', ''] }),
    ]);
    expect(bool.filter).toEqual([{ range: { FlightDelayMin: { gte: 10 } } }]);
  });

  it('turns ES|QL controls into variables, numbers cast, single and multi select', async () => {
    const { variables } = await contextOf([
      {
        id: 'e1',
        type: 'esql_control',
        config: {
          variable_name: 'carrier',
          variable_type: 'values',
          selected_options: ['JetBeats'],
        },
      },
      {
        id: 'e2',
        type: 'esql_control',
        config: {
          variable_name: 'n',
          variable_type: 'multi_values',
          single_select: false,
          selected_options: ['1', 'x'],
        },
      },
    ]);
    expect(variables).toEqual([
      { key: 'carrier', value: 'JetBeats', type: 'values' },
      { key: 'n', value: [1, 'x'], type: 'multi_values' },
    ]);
  });

  it('narrows the time range to the time slider’s window, anchored or not', async () => {
    const range = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-11T00:00:00.000Z' };
    const slider = (config: Record<string, unknown>) =>
      contextOf([{ id: 't', type: 'time_slider_control', config }], range);
    expect(
      (await slider({ start_percentage_of_time_range: 0.5, end_percentage_of_time_range: 0.6 }))
        .timeslice
    ).toEqual({
      from: '2026-10-06T00:00:00.000Z',
      to: '2026-10-07T00:00:00.000Z',
    });
    expect(
      (
        await slider({
          start_percentage_of_time_range: 0.5,
          end_percentage_of_time_range: 0.6,
          is_anchored: true,
        })
      ).timeslice?.from
    ).toBe(range.from);
    expect((await slider({})).timeslice).toBeUndefined();
  });

  it('names what it can’t apply rather than dropping it', async () => {
    const { diagnostics } = await buildDashboardContext({
      saved: { filters: [] },
      controls: [
        control('x', 'some_future_control', {}),
        control('y', 'options_list_control', { field_name: 'gone', selected_options: ['a'] }),
      ],
      resolveField: async () => undefined,
    });
    expect(diagnostics).toEqual([
      expect.stringMatching(/^some_future_control .*no lowering for this control type/),
      expect.stringMatching(/field gone not found/),
    ]);
  });

  it('applies the saved query and filters, with their data views put back', async () => {
    const saved = readSavedContext(
      {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            query: { query: 'status:error', language: 'kuery' },
            filter: [
              {
                meta: {
                  indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
                },
                query: { match_phrase: { host: 'a' } },
              },
            ],
          }),
        },
      },
      [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
          type: 'index-pattern',
          id: 'logs',
        },
      ]
    );
    expect(saved.filters[0].meta.index).toBe('logs');
    const { bool } = await buildDashboardContext({ saved, controls: [] });
    expect(JSON.stringify(bool)).toContain('status');
    expect(bool.filter).toEqual(expect.arrayContaining([{ match_phrase: { host: 'a' } }]));
  });
});

describe('controls corpus', () => {
  // Every control group in the repo's fixtures and archives: each control applies, is empty, or is named.
  const dashboards = [
    ...corpusObjects(['dashboard'], 'controlGroupInput'),
    ...corpusObjects(['dashboard'], 'pinned_panels'),
  ];

  // Recorded 2026-10-20: 33 dashboards in 24 files. A drop means the corpus walk broke; a rise is welcome.
  it('finds the corpus', () => {
    expect(dashboards.length).toBeGreaterThanOrEqual(33);
  });

  it('lowers every control in it', async () => {
    const tally: Record<string, number> = {};
    for (const { attributes, references, file, id } of dashboards) {
      const controls = readPinnedControls(attributes, references);
      const { diagnostics } = await buildDashboardContext({
        saved: { filters: [] },
        controls,
        resolveField,
        timeRange: { from: '2026-10-01T00:00:00.000Z', to: '2026-10-11T00:00:00.000Z' },
      });
      for (const { type } of controls) tally[type] = (tally[type] ?? 0) + 1;
      // Only a control without a field may go unapplied; an unknown type would be a decision to make.
      expect({
        file,
        id,
        diagnostics: diagnostics.filter((d) => !/no data view or field/.test(d)),
      }).toEqual({
        file,
        id,
        diagnostics: [],
      });
    }
    // Recorded 2026-10-20: every control type Kibana has is in the corpus, and each applies.
    expect(tally).toEqual(
      expect.objectContaining({
        options_list_control: expect.any(Number),
        range_slider_control: expect.any(Number),
        time_slider_control: expect.any(Number),
        esql_control: expect.any(Number),
      })
    );
  });
});
