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
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY host',
      template: '<div>resolved</div>',
      height: 320,
    });
  });

  describe('new panels', () => {
    it('builds the panel from the request and the host deps, with nothing existing', async () => {
      const result = await resolve(addRequest({ hasData: true, index: 'logs-*' }));

      expect(mockedBuild).toHaveBeenCalledWith({
        nlQuery: 'Show KPI',
        index: 'logs-*',
        esql: undefined,
        hasData: true,
        regenerateESQL: undefined,
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
      mockedBuild.mockResolvedValue({ template: '<div>banner</div>', height: 200 });

      const result = await resolve(addRequest({ hasData: false }));

      expect(result).toMatchObject({
        panelContent: { config: { esql_query: undefined, template: '<div>banner</div>' } },
      });
    });

    it('passes a user-supplied query through', async () => {
      await resolve(addRequest({ esql: 'FROM metrics-*', hasData: true }));

      expect(mockedBuild).toHaveBeenCalledWith(expect.objectContaining({ esql: 'FROM metrics-*' }));
    });
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
          existing: { esqlQuery: 'FROM logs-*', template: '<div>old</div>' },
        })
      );
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
        expect.objectContaining({ regenerateESQL: true, hasData: true, index: 'logs-*' })
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
      mockedBuild.mockResolvedValue({ template: '<div>static</div>', height: 200 });

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
