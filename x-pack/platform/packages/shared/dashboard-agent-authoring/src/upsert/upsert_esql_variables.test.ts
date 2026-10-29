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
  panels: Array<{ id: string; content: Record<string, unknown> }>
) =>
  executeDashboardUpsert({
    dashboardData,
    // The upsert schema is validated before this runs; the contents here are valid by construction.
    upsert: { panels } as never,
    logger,
    resolvePanelContent,
  });

const restyle = (id: string) => ({
  id,
  content: { source: 'request', renderer: 'custom_content', query: 'use a darker background' },
});

// A custom content panel's queries can refer to the dashboard's ES|QL controls (`?host`). Generating
// or sampling a query needs the control's value, and the saved dashboard is the only place the tool
// can read it from.
describe('executeDashboardUpsert, ES|QL control values for custom content', () => {
  it('gives an edited custom content panel the values of the dashboard controls', async () => {
    const resolvePanelContent = createResolver();

    await upsert(
      resolvePanelContent,
      { title: 'Test', panels: [customContentPanel], pinned_panels: [hostControl] },
      [restyle('cc-1')]
    );

    expect(resolvePanelContent).toHaveBeenCalledWith(
      expect.objectContaining({
        renderer: 'custom_content',
        esqlVariables: [{ key: 'host', value: 'web-1', type: 'values' }],
      })
    );
  });

  it('gives a new custom content panel the values too, since its own query can use a control', async () => {
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

    expect(resolvePanelContent).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlVariables: [{ key: 'host', value: 'web-1', type: 'values' }],
      })
    );
  });

  it('adds nothing to the request when the dashboard has no ES|QL controls', async () => {
    const resolvePanelContent = createResolver();

    await upsert(
      resolvePanelContent,
      {
        title: 'Test',
        panels: [customContentPanel],
        pinned_panels: [{ id: 'c', type: 'options_list_control', config: { field_name: 'host' } }],
      },
      [restyle('cc-1')]
    );

    expect(resolvePanelContent.mock.calls[0][0]).not.toHaveProperty('esqlVariables');
  });

  it('adds nothing when the dashboard has no controls at all', async () => {
    const resolvePanelContent = createResolver();

    await upsert(resolvePanelContent, { title: 'Test', panels: [customContentPanel] }, [
      restyle('cc-1'),
    ]);

    expect(resolvePanelContent.mock.calls[0][0]).not.toHaveProperty('esqlVariables');
  });

  it('does not give them to other kinds of panel, which have their own query handling', async () => {
    const resolvePanelContent = createResolver();

    await upsert(
      resolvePanelContent,
      { title: 'Test', panels: [lensPanel], pinned_panels: [hostControl] },
      [{ id: 'lens-1', content: { source: 'request', renderer: 'lens', query: 'make it a bar' } }]
    );

    expect(resolvePanelContent.mock.calls[0][0]).toMatchObject({ renderer: 'lens' });
    expect(resolvePanelContent.mock.calls[0][0]).not.toHaveProperty('esqlVariables');
  });

  it('gives each custom content panel of one call the same values', async () => {
    const resolvePanelContent = createResolver();

    await upsert(
      resolvePanelContent,
      {
        title: 'Test',
        panels: [
          customContentPanel,
          { ...customContentPanel, id: 'cc-2', grid: { ...grid, y: 9 } },
        ],
        pinned_panels: [hostControl],
      },
      [restyle('cc-1'), restyle('cc-2')]
    );

    expect(resolvePanelContent).toHaveBeenCalledTimes(2);
    resolvePanelContent.mock.calls.forEach(([request]) =>
      expect(request).toMatchObject({ esqlVariables: [{ key: 'host', value: 'web-1' }] })
    );
  });
});
