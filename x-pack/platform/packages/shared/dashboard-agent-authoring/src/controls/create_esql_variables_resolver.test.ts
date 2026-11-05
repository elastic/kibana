/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { createEsqlVariablesResolver } from './create_esql_variables_resolver';

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

type ResolverParams = Parameters<typeof createEsqlVariablesResolver>[0];

/** The variables a panel in `section` gets for `queries`. */
const getEsqlVariables = (
  params: ResolverParams,
  queries: string[] = [],
  section: string | null = null
) => createEsqlVariablesResolver(params)(section)(queries);

describe('createEsqlVariablesResolver', () => {
  it('publishes the value of an ES|QL control under its variable name', async () => {
    expect(await getEsqlVariables({ pinnedPanels: [esqlControl('host', ['web-1'])] })).toEqual([
      { key: 'host', value: 'web-1', type: 'values' },
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

  describe('controls unpinned into the grid', () => {
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
    const pinnedPanels = [esqlControl('pinned', ['0'])];

    it('reads them after the pinned ones, and a section control only for its own section', async () => {
      expect(await getEsqlVariables({ pinnedPanels, panels }, [], 'section')).toEqual([
        { key: 'pinned', value: 0, type: 'values' },
        { key: 'top', value: 1, type: 'values' },
        { key: 'inner', value: 2, type: 'values', meta: { group: 'section' } },
      ]);
      for (const otherSection of [null, 'other-section']) {
        expect(
          (await getEsqlVariables({ pinnedPanels, panels }, [], otherSection)).map(({ key }) => key)
        ).toEqual(['pinned', 'top']);
      }
    });
  });

  describe('the column type of a query-based control', () => {
    const usesBytes = ['FROM logs | WHERE bytes > ?bytes'];

    it('casts the selection by the type the resolver returns for the control query', async () => {
      const resolveColumnType = jest.fn().mockResolvedValue('long');
      const timeRange = { from: 'now-7d', to: 'now' };

      expect(
        await getEsqlVariables(
          {
            pinnedPanels: [
              esqlControl('static', ['a'], { control_type: 'STATIC_VALUES' }),
              queryControl('bytes', ['100']),
            ],
            timeRange,
            resolveColumnType,
          },
          usesBytes
        )
      ).toEqual([
        { key: 'static', value: 'a', type: 'values' },
        { key: 'bytes', value: 100, type: 'values' },
      ]);
      expect(resolveColumnType).toHaveBeenCalledTimes(1);
      expect(resolveColumnType).toHaveBeenCalledWith({
        query: 'FROM logs | STATS BY bytes',
        esqlVariables: expect.any(Array),
        timeRange,
      });
    });

    it('asks only for a control the queries use, as ?name or ??name', async () => {
      const resolveColumnType = jest.fn().mockResolvedValue('long');

      await getEsqlVariables(
        {
          pinnedPanels: [
            queryControl('bytes', ['100']),
            queryControl('bytes_total', ['5']),
            queryControl('other', ['7']),
          ],
          resolveColumnType,
        },
        ['FROM logs | WHERE a > ?bytes | KEEP ??bytes_total']
      );

      expect(resolveColumnType).toHaveBeenCalledTimes(2);
    });

    it('asks for every control with a numeric-looking selection for a query not written yet', async () => {
      const resolveColumnType = jest.fn().mockResolvedValue('long');

      expect(
        await createEsqlVariablesResolver({
          pinnedPanels: [queryControl('bytes', ['100'])],
          resolveColumnType,
        })(null)([], { anyVariable: true })
      ).toEqual([{ key: 'bytes', value: 100, type: 'values' }]);
    });

    it('asks for nothing when no query uses a control, or there are no queries', async () => {
      const resolveColumnType = jest.fn();
      const params = { pinnedPanels: [queryControl('bytes', ['100'])], resolveColumnType };

      await getEsqlVariables(params, ['FROM logs | STATS count() BY host']);
      await getEsqlVariables(params, []);

      expect(resolveColumnType).not.toHaveBeenCalled();
    });

    it('asks once per control, however many times the variables are resolved', async () => {
      const resolveColumnType = jest.fn().mockResolvedValue('long');
      const resolve = createEsqlVariablesResolver({
        pinnedPanels: [queryControl('bytes', ['100'])],
        resolveColumnType,
      });

      await resolve(null)(usesBytes);
      await resolve(null)(usesBytes);
      await resolve('section')(usesBytes);

      expect(resolveColumnType).toHaveBeenCalledTimes(1);
    });

    it('does not ask for a control whose selection cannot be a number', async () => {
      const resolveColumnType = jest.fn();

      await getEsqlVariables(
        {
          pinnedPanels: [queryControl('bytes', ['web-1']), queryControl('none', [])],
          resolveColumnType,
        },
        ['FROM logs | WHERE a > ?bytes AND b > ?none']
      );

      expect(resolveColumnType).not.toHaveBeenCalled();
    });

    it.each([
      ['cannot tell the type', jest.fn().mockResolvedValue(undefined)],
      ['fails', jest.fn().mockRejectedValue(new Error('boom'))],
    ])('guesses from the value when the resolver %s', async (_label, resolveColumnType) => {
      expect(
        await getEsqlVariables(
          { pinnedPanels: [queryControl('bytes', ['100'])], resolveColumnType },
          usesBytes
        )
      ).toEqual([{ key: 'bytes', value: 100, type: 'values' }]);
    });
  });
});
