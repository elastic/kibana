/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getEsqlVariables } from './get_esql_variables';

const esqlControl = (name: string, selected: string[], extra: Record<string, unknown> = {}) => ({
  id: `control-${name}`,
  type: ESQL_CONTROL,
  config: { variable_name: name, variable_type: 'values', selected_options: selected, ...extra },
});

const grid = { x: 0, y: 0, w: 24, h: 10 };
const gridControl = (name: string, selected: string[]) => ({
  ...esqlControl(name, selected),
  grid,
});
const queryControl = (name: string, selected: string[], extra: Record<string, unknown> = {}) =>
  esqlControl(name, selected, {
    control_type: 'VALUES_FROM_QUERY',
    esql_query: 'FROM logs | STATS BY bytes',
    ...extra,
  });

describe('getEsqlVariables', () => {
  it('publishes the value of an ES|QL control under its variable name', async () => {
    expect(await getEsqlVariables({ pinnedPanels: [esqlControl('host', ['web-1'])] })).toEqual([
      { key: 'host', value: 'web-1', type: 'values' },
    ]);
  });

  it('reads one variable per ES|QL control, in order, however the control selects', async () => {
    expect(
      await getEsqlVariables({
        pinnedPanels: [
          esqlControl('a', ['1'], { control_type: 'STATIC_VALUES' }),
          esqlControl('b', ['x', 'y'], { variable_type: 'multi_values', single_select: false }),
        ],
      })
    ).toEqual([
      { key: 'a', value: 1, type: 'values' },
      { key: 'b', value: ['x', 'y'], type: 'multi_values' },
    ]);
  });

  it('skips controls that are not ES|QL variable controls', async () => {
    expect(
      await getEsqlVariables({
        pinnedPanels: [
          { id: 'c1', type: 'options_list_control', config: { field_name: 'host.name' } },
          { id: 'c2', type: 'range_slider_control', config: { field_name: 'bytes' } },
          esqlControl('host', ['web-1']),
        ],
      })
    ).toEqual([{ key: 'host', value: 'web-1', type: 'values' }]);
  });

  it('does not read the config of a control that is not an ES|QL control, even if it looks like one', async () => {
    expect(
      await getEsqlVariables({
        pinnedPanels: [
          {
            id: 'c1',
            type: 'options_list_control',
            config: { variable_name: 'host', variable_type: 'values', selected_options: ['a'] },
          },
        ],
      })
    ).toEqual([]);
  });

  it.each([
    ['no config', { id: 'c', type: ESQL_CONTROL }],
    ['a config that is not an object', { id: 'c', type: ESQL_CONTROL, config: 'nope' }],
    ['a config that is a list', { id: 'c', type: ESQL_CONTROL, config: [] }],
    ['a config with no variable name', { id: 'c', type: ESQL_CONTROL, config: {} }],
  ])('skips an ES|QL control with %s instead of failing', async (_label, control) => {
    expect(await getEsqlVariables({ pinnedPanels: [control] })).toEqual([]);
  });

  it('returns nothing for no controls', async () => {
    expect(await getEsqlVariables({})).toEqual([]);
  });

  describe('controls unpinned into the grid', () => {
    it('reads them after the pinned ones, wherever they are', async () => {
      const panels = [
        gridControl('top', ['1']),
        {
          id: 'section',
          title: 'Section',
          collapsed: false,
          grid: { y: 10 },
          panels: [gridControl('inner', ['2'])],
        },
        { id: 'chart', type: 'lens', config: {}, grid },
      ] as DashboardAttachmentData['panels'];

      expect(
        await getEsqlVariables({ pinnedPanels: [esqlControl('pinned', ['0'])], panels })
      ).toEqual([
        { key: 'pinned', value: '0', type: 'values' },
        { key: 'top', value: '1', type: 'values' },
        { key: 'inner', value: '2', type: 'values' },
      ]);
    });
  });

  describe('the column type of a query-based control', () => {
    it('casts the selection by the type the resolver returns for the control query', async () => {
      const resolveColumnType = jest.fn().mockResolvedValue('long');

      expect(
        await getEsqlVariables({
          pinnedPanels: [
            esqlControl('static', ['a'], { control_type: 'STATIC_VALUES' }),
            queryControl('bytes', ['100']),
          ],
          resolveColumnType,
        })
      ).toEqual([
        { key: 'static', value: 'a', type: 'values' },
        { key: 'bytes', value: 100, type: 'values' },
      ]);
      expect(resolveColumnType).toHaveBeenCalledTimes(1);
      expect(resolveColumnType).toHaveBeenCalledWith({
        query: 'FROM logs | STATS BY bytes',
        esqlVariables: expect.any(Array),
      });
    });

    it('keeps a keyword column as text', async () => {
      expect(
        await getEsqlVariables({
          pinnedPanels: [queryControl('code', ['404'])],
          resolveColumnType: jest.fn().mockResolvedValue('keyword'),
        })
      ).toEqual([{ key: 'code', value: '404', type: 'values' }]);
    });

    it('does not ask for a control whose selection cannot be a number', async () => {
      const resolveColumnType = jest.fn();

      await getEsqlVariables({
        pinnedPanels: [queryControl('host', ['web-1']), queryControl('none', [])],
        resolveColumnType,
      });

      expect(resolveColumnType).not.toHaveBeenCalled();
    });

    it.each([
      ['cannot tell the type', jest.fn().mockResolvedValue(undefined)],
      ['fails', jest.fn().mockRejectedValue(new Error('boom'))],
    ])('keeps the selection as text when the resolver %s', async (_label, resolveColumnType) => {
      expect(
        await getEsqlVariables({
          pinnedPanels: [queryControl('bytes', ['100'])],
          resolveColumnType,
        })
      ).toEqual([{ key: 'bytes', value: '100', type: 'values' }]);
    });

    it('keeps the selection as text when there is no resolver', async () => {
      expect(await getEsqlVariables({ pinnedPanels: [queryControl('bytes', ['100'])] })).toEqual([
        { key: 'bytes', value: '100', type: 'values' },
      ]);
    });
  });
});
