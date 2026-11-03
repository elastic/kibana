/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { ResolvePanelContent } from '../panels';
import type { PanelContentAttempt } from '../resolve_panel';
import { executeDashboardUpsert } from './upsert_dashboard';

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const grid = { x: 0, y: 0, w: 24, h: 9 };

const customContentPanel: AttachmentPanel = {
  id: 'cc-1',
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  config: { esql_query: ['FROM logs | WHERE host.name == ?host'], template: '<div>old</div>' },
  grid,
};

const lensPanel: AttachmentPanel = {
  id: 'lens-1',
  type: LENS_EMBEDDABLE_TYPE,
  config: { type: 'metric', data_source: { type: 'esql', query: 'FROM logs | STATS count()' } },
  grid: { ...grid, y: 9 },
};

const bytesPanel: AttachmentPanel = {
  ...customContentPanel,
  config: { esql_query: ['FROM logs | WHERE bytes > ?bytes'], template: '<div>old</div>' },
};

const bytesControl = {
  id: 'control-bytes',
  type: ESQL_CONTROL,
  config: {
    variable_name: 'bytes',
    variable_type: 'values',
    selected_options: ['100'],
    control_type: 'VALUES_FROM_QUERY',
    esql_query: 'FROM logs | STATS BY bytes',
  },
};

const hostControl = {
  id: 'control-host',
  type: ESQL_CONTROL,
  config: {
    variable_name: 'host',
    variable_type: 'values',
    selected_options: ['web-1'],
    single_select: true,
  },
};

const createResolver = () =>
  jest.fn<ReturnType<ResolvePanelContent>, Parameters<ResolvePanelContent>>(
    async (): Promise<PanelContentAttempt> => ({
      type: 'success',
      panelContent: {
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { template: '<div>new</div>' },
      },
      authoringNote: 'Updated the panel.',
    })
  );

const upsert = (
  resolvePanelContent: ResolvePanelContent,
  dashboardData: Parameters<typeof executeDashboardUpsert>[0]['dashboardData'],
  panels: Array<{ id: string; section?: string; content?: Record<string, unknown> }>
) =>
  executeDashboardUpsert({
    dashboardData,
    upsert: { panels } as never,
    logger,
    resolvePanelContent,
  });

const restyle = (id: string) => ({
  id,
  content: { source: 'request', renderer: 'custom_content', query: 'use a darker background' },
});

/** The variables the `callIndex`th panel request asks for, for a panel that runs `queries`. */
const variablesAskedBy = async (
  resolvePanelContent: jest.MockedFunction<ResolvePanelContent>,
  callIndex = 0,
  queries: string[] = []
) => resolvePanelContent.mock.calls[callIndex][0].resolveEsqlVariables?.(queries);

describe('executeDashboardUpsert, ES|QL control values for custom content', () => {
  it('lets an edited custom content panel ask for the values of the dashboard controls', async () => {
    const resolvePanelContent = createResolver();

    await upsert(
      resolvePanelContent,
      { title: 'Test', panels: [customContentPanel], pinned_panels: [hostControl] },
      [restyle('cc-1')]
    );

    expect(await variablesAskedBy(resolvePanelContent)).toEqual([
      { key: 'host', value: 'web-1', type: 'values' },
    ]);
  });

  it('does the same for a new panel, since its own query can use a control', async () => {
    const resolvePanelContent = createResolver();

    await upsert(resolvePanelContent, { title: 'Test', panels: [], pinned_panels: [hostControl] }, [
      {
        id: 'new-cc',
        content: {
          source: 'request',
          renderer: 'custom_content',
          query: 'a card for the selected host',
          hasData: true,
          esql: 'FROM logs | WHERE host.name == ?host | STATS n = COUNT(*)',
        },
      },
    ]);

    expect(await variablesAskedBy(resolvePanelContent)).toEqual([
      { key: 'host', value: 'web-1', type: 'values' },
    ]);
  });

  it('gives a panel the controls unpinned into the grid, and those of its own section only', async () => {
    const resolvePanelContent = createResolver();
    const unpinned = (id: string, name: string, selected: string) => ({
      ...hostControl,
      id,
      config: { ...hostControl.config, variable_name: name, selected_options: [selected] },
      grid: { ...grid, y: 20 },
    });
    const section = (id: string, panels: AttachmentPanel[]) => ({
      id,
      title: id,
      collapsed: false,
      grid: { y: 30 },
      panels,
    });

    await upsert(
      resolvePanelContent,
      {
        title: 'Test',
        panels: [
          customContentPanel,
          unpinned('grid-control', 'region', 'eu'),
          section('section-a', [
            { ...customContentPanel, id: 'cc-a' },
            unpinned('control-a', 'env', 'prod'),
          ]),
          section('section-b', [{ ...customContentPanel, id: 'cc-b' }]),
        ],
        pinned_panels: [hostControl],
      },
      [restyle('cc-1'), restyle('cc-a'), restyle('cc-b')]
    );

    const keysOf = async (callIndex: number) =>
      (await variablesAskedBy(resolvePanelContent, callIndex))?.map(({ key }) => key);
    expect(await keysOf(0)).toEqual(['host', 'region']);
    expect(await keysOf(1)).toEqual(['host', 'region', 'env']);
    expect(await keysOf(2)).toEqual(['host', 'region']);
  });

  // `cc-a` and the control start in `section-a`, `cc-b` in `section-b`.
  it.each([
    ['a control moves into the section of the panel', 'control-a', 'cc-b', ['host']],
    ['a panel moves out of the section of the control', 'cc-a', 'cc-a', []],
  ])('uses the sections after the call when %s', async (_label, movedId, editedId, keys) => {
    const resolvePanelContent = createResolver();
    const section = (id: string, panels: AttachmentPanel[]) => ({
      id,
      title: id,
      collapsed: false,
      grid: { y: 30 },
      panels,
    });
    const control = { ...hostControl, id: 'control-a', grid };
    const moved = { id: movedId, section: 'section-b' };

    await upsert(
      resolvePanelContent,
      {
        title: 'Test',
        panels: [
          section('section-a', [{ ...customContentPanel, id: 'cc-a' }, control]),
          section('section-b', [{ ...customContentPanel, id: 'cc-b' }]),
        ],
      },
      movedId === editedId ? [{ ...restyle(editedId), ...moved }] : [moved, restyle(editedId)]
    );

    expect((await variablesAskedBy(resolvePanelContent))?.map(({ key }) => key)).toEqual(keys);
  });

  it.each([
    ['a pinned control', 'control-host', ['region']],
    ['a control in the grid', 'grid-region', ['host']],
  ])('does not bind the value of %s that the call removes', async (_label, removed, keys) => {
    const resolvePanelContent = createResolver();
    const regionControl = {
      ...hostControl,
      id: 'grid-region',
      config: { ...hostControl.config, variable_name: 'region', selected_options: ['eu'] },
      grid,
    };

    await executeDashboardUpsert({
      dashboardData: {
        title: 'Test',
        panels: [customContentPanel, regionControl],
        pinned_panels: [hostControl],
      },
      upsert: { panels: [restyle('cc-1')], remove: [removed] } as never,
      logger,
      resolvePanelContent,
    });

    expect((await variablesAskedBy(resolvePanelContent))?.map(({ key }) => key)).toEqual(keys);
  });

  describe('the column type of a query-based control', () => {
    const run = ({
      resolvePanelContent = createResolver(),
      resolveEsqlControlColumnType = jest.fn().mockResolvedValue('long'),
      time_range,
      panels = [restyle('cc-1')],
    }: {
      resolvePanelContent?: ReturnType<typeof createResolver>;
      resolveEsqlControlColumnType?: jest.Mock;
      time_range?: { from: string; to: string };
      panels?: Array<{ id: string; content: Record<string, unknown> }>;
    } = {}) =>
      executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          time_range: { from: 'now-7d', to: 'now' },
          panels: [bytesPanel],
          pinned_panels: [bytesControl],
        },
        upsert: { ...(time_range ? { time_range } : {}), panels } as never,
        logger,
        resolvePanelContent,
        resolveEsqlControlColumnType,
      });

    it('casts the selection by the column type the resolver finds, when a query uses the variable', async () => {
      const resolvePanelContent = createResolver();

      await run({ resolvePanelContent });

      expect(
        await variablesAskedBy(resolvePanelContent, 0, ['FROM logs | WHERE bytes > ?bytes'])
      ).toEqual([{ key: 'bytes', value: 100, type: 'values' }]);
    });

    it('looks nothing up until a panel asks, and not for a query that does not use the variable', async () => {
      const resolvePanelContent = createResolver();
      const resolveEsqlControlColumnType = jest.fn().mockResolvedValue('long');

      await run({ resolvePanelContent, resolveEsqlControlColumnType });
      expect(resolveEsqlControlColumnType).not.toHaveBeenCalled();

      await variablesAskedBy(resolvePanelContent, 0, ['FROM logs | STATS count() BY host']);
      expect(resolveEsqlControlColumnType).not.toHaveBeenCalled();
    });

    it('resolves the type with the time range the call sets, else the dashboard one', async () => {
      const queries = ['FROM logs | WHERE bytes > ?bytes'];
      const timeRangeUsedBy = async (time_range?: { from: string; to: string }) => {
        const resolvePanelContent = createResolver();
        const resolveEsqlControlColumnType = jest.fn().mockResolvedValue('long');
        await run({ resolvePanelContent, resolveEsqlControlColumnType, time_range });
        await variablesAskedBy(resolvePanelContent, 0, queries);
        return resolveEsqlControlColumnType.mock.calls[0][0].timeRange;
      };

      expect(await timeRangeUsedBy()).toEqual({ from: 'now-7d', to: 'now' });
      expect(await timeRangeUsedBy({ from: 'now-1h', to: 'now' })).toEqual({
        from: 'now-1h',
        to: 'now',
      });
    });
  });

  it('gives it to every kind of panel, for whichever uses it', async () => {
    const resolvePanelContent = createResolver();

    await upsert(
      resolvePanelContent,
      { title: 'Test', panels: [lensPanel], pinned_panels: [hostControl] },
      [{ id: 'lens-1', content: { source: 'request', renderer: 'lens', query: 'make it a bar' } }]
    );

    expect(resolvePanelContent.mock.calls[0][0]).toMatchObject({ renderer: 'lens' });
    expect(await variablesAskedBy(resolvePanelContent)).toEqual([
      { key: 'host', value: 'web-1', type: 'values' },
    ]);
  });
});
