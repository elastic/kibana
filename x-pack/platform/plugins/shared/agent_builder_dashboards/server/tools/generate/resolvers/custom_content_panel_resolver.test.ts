/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCustomContentConfig } from '@kbn/agent-builder-visualizations-server';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type {
  CustomContentPanelAddRequest,
  CustomContentPanelEditRequest,
} from '@kbn/dashboard-agent-authoring';
import type { Logger } from '@kbn/logging';
import { createCustomContentPanelResolver } from './custom_content_panel_resolver';

jest.mock('@kbn/agent-builder-visualizations-server', () => ({
  buildCustomContentConfig: jest.fn(),
  toCustomContentQueryChanges: jest.requireActual('@kbn/agent-builder-visualizations-server')
    .toCustomContentQueryChanges,
}));

const mockedBuild = jest.mocked(buildCustomContentConfig);

const grid = { x: 0, y: 0, w: 12, h: 5 };

const customContentPanel = (config: Record<string, unknown>): AttachmentPanel => ({
  id: 'cc-1',
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  config,
  grid,
});

const addRequest = (
  overrides: Partial<CustomContentPanelAddRequest> = {}
): CustomContentPanelAddRequest => ({
  renderer: 'custom_content',
  nlQuery: 'Show KPI',
  hasData: false,
  ...overrides,
});

const editRequest = (
  existingPanel: AttachmentPanel,
  overrides: Partial<CustomContentPanelEditRequest> = {}
): CustomContentPanelEditRequest => ({
  renderer: 'custom_content',
  existingPanel,
  ...overrides,
});

describe('createCustomContentPanelResolver', () => {
  const deps = {
    logger: {} as Logger,
    modelProvider: {} as ModelProvider,
    events: {} as ToolEventEmitter,
    esClient: {} as IScopedClusterClient,
  };
  const resolve = createCustomContentPanelResolver(deps);

  beforeEach(() => {
    mockedBuild.mockReset();
    mockedBuild.mockResolvedValue({
      esqlQueries: ['FROM logs-* | STATS count = COUNT(*) BY host'],
      template: '<div>resolved</div>',
      height: 320,
    });
  });

  describe('new panels', () => {
    it('builds the panel from the request and the host deps, with nothing existing', async () => {
      const result = await resolve(addRequest({ hasData: true, index: 'logs-*' }));

      expect(mockedBuild).toHaveBeenCalledWith({
        nlQuery: 'Show KPI',
        datasets: [{ description: 'Show KPI', index: 'logs-*' }],
        resolveEsqlVariables: undefined,
        existing: undefined,
        ...deps,
      });
      expect(result).toEqual({
        type: 'success',
        panelContent: {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: {
            esql_query: ['FROM logs-* | STATS count = COUNT(*) BY host'],
            template: '<div>resolved</div>',
          },
        },
      });
    });

    it('stores no query for a panel without data', async () => {
      mockedBuild.mockResolvedValue({
        esqlQueries: [],
        template: '<div>banner</div>',
        height: 200,
      });

      const result = await resolve(addRequest({ hasData: false }));

      expect(result).toMatchObject({
        panelContent: { config: { esql_query: undefined, template: '<div>banner</div>' } },
      });
    });

    it('passes a user-supplied query through', async () => {
      await resolve(addRequest({ esql: 'FROM metrics-*', hasData: true }));

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({ datasets: [{ esql: 'FROM metrics-*' }] })
      );
    });
  });

  it('hands the datasets of a new panel to the builder, which generates a query for each', async () => {
    const datasets = [{ description: 'totals', index: 'logs' }, { esql: 'FROM logs | LIMIT 5' }];
    mockedBuild.mockResolvedValue({
      esqlQueries: ['FROM logs | STATS n = COUNT(*)', 'FROM logs | LIMIT 5'],
      template: '<div>two queries</div>',
      height: 300,
    });

    const result = await resolve(
      addRequest({ nlQuery: 'totals above a list', hasData: true, datasets })
    );

    expect(mockedBuild).toHaveBeenCalledWith(expect.objectContaining({ datasets }));
    expect(result).toMatchObject({
      panelContent: {
        config: {
          esql_query: ['FROM logs | STATS n = COUNT(*)', 'FROM logs | LIMIT 5'],
          template: '<div>two queries</div>',
        },
      },
    });
  });

  it('hands the control values resolver of the request to the builder', async () => {
    const resolveEsqlVariables = jest.fn();

    await resolve(addRequest({ hasData: true, resolveEsqlVariables }));

    expect(mockedBuild).toHaveBeenCalledWith(expect.objectContaining({ resolveEsqlVariables }));
  });

  describe('edits', () => {
    const panel = customContentPanel({
      template: '<div>old</div>',
      esql_query: ['FROM logs-*'],
      title: 'Errors by host',
      description: 'Last week',
      time_range: { from: 'now-7d', to: 'now' },
    });

    it('hands the stored query and template to the builder', async () => {
      await resolve(editRequest(panel, { nlQuery: 'Make the badges blue' }));

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          nlQuery: 'Make the badges blue',
          existing: {
            esqlQueries: ['FROM logs-*'],
            template: '<div>old</div>',
          },
        })
      );
    });

    it('hands the additional queries of a multi-query panel to the builder', async () => {
      await resolve(
        editRequest(
          customContentPanel({
            template: '<div>{{ queries[1].rows.size }}</div>',
            esql_query: ['FROM logs-*', 'FROM metrics-*'],
          }),
          { nlQuery: 'Restyle' }
        )
      );

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          existing: expect.objectContaining({
            esqlQueries: ['FROM logs-*', 'FROM metrics-*'],
          }),
        })
      );
    });

    it('stores the additional queries the builder keeps after the main one', async () => {
      mockedBuild.mockResolvedValue({
        esqlQueries: ['FROM logs-*', 'FROM metrics-*'],
        template: '<div>resolved</div>',
        height: 320,
      });

      const result = await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*', 'FROM metrics-*'] }), {
          nlQuery: 'Update',
        })
      );

      expect(result).toMatchObject({
        panelContent: { config: { esql_query: ['FROM logs-*', 'FROM metrics-*'] } },
      });
    });

    it('stores no query, and so no additional ones, when the builder returns none', async () => {
      mockedBuild.mockResolvedValue({
        esqlQueries: [],
        template: '<div>static</div>',
        height: 200,
      });

      const result = await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*', 'FROM metrics-*'] }), {
          nlQuery: 'Make it static',
          hasData: false,
        })
      );

      expect(result).toMatchObject({ panelContent: { config: { esql_query: undefined } } });
    });

    it('hands the datasets of an edit to the builder, and stores the queries it returns', async () => {
      const datasets = [{}, { description: 'the ten busiest services' }];
      mockedBuild.mockResolvedValue({
        esqlQueries: ['FROM logs-*', 'FROM metrics | LIMIT 10'],
        template: '<div>updated</div>',
        height: 300,
      });

      const result = await resolve(
        editRequest(
          customContentPanel({
            template: '<div>old</div>',
            esql_query: ['FROM logs-*', 'FROM metrics-*'],
          }),
          { nlQuery: 'Show the busiest', datasets }
        )
      );

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          datasets,
          existing: expect.objectContaining({ esqlQueries: ['FROM logs-*', 'FROM metrics-*'] }),
        })
      );
      expect(result).toMatchObject({
        panelContent: { config: { esql_query: ['FROM logs-*', 'FROM metrics | LIMIT 10'] } },
      });
    });

    it('forwards the data flags', async () => {
      await resolve(
        editRequest(panel, {
          nlQuery: 'Also show the average bytes',
          regenerateESQL: true,
          hasData: true,
          index: 'logs-*',
        })
      );

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          datasets: [{ description: 'Also show the average bytes', index: 'logs-*' }],
        })
      );
    });

    it('keeps the settings of the panel that are not the query or the template', async () => {
      const result = await resolve(editRequest(panel, { nlQuery: 'Make it blue' }));

      expect(result).toMatchObject({
        panelContent: {
          config: {
            title: 'Errors by host',
            description: 'Last week',
            time_range: { from: 'now-7d', to: 'now' },
            esql_query: ['FROM logs-* | STATS count = COUNT(*) BY host'],
            template: '<div>resolved</div>',
          },
        },
      });
    });

    it('drops the query but keeps the other settings when the builder returns none', async () => {
      mockedBuild.mockResolvedValue({
        esqlQueries: [],
        template: '<div>static</div>',
        height: 200,
      });

      const result = await resolve(editRequest(panel, { esql: null }));

      expect(result).toMatchObject({
        panelContent: { config: { title: 'Errors by host', esql_query: undefined } },
      });
    });
  });

  it('turns a builder failure into a failed attempt with its message', async () => {
    mockedBuild.mockRejectedValue(new Error('Could not generate an ES|QL query for this panel'));

    expect(await resolve(addRequest({ hasData: true }))).toEqual({
      type: 'failure',
      error: 'Could not generate an ES|QL query for this panel',
    });
  });
});
