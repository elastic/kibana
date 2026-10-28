/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type {
  CustomContentPanelAddRequest,
  CustomContentPanelEditRequest,
} from '@kbn/dashboard-agent-authoring';
import { createCustomContentPanelResolver } from './custom_content_panel_resolver';

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
  const resolveTemplate = jest.fn();
  const generateEsql = jest.fn();
  const resolve = createCustomContentPanelResolver({ resolveTemplate, generateEsql });

  beforeEach(() => {
    resolveTemplate.mockReset();
    resolveTemplate.mockResolvedValue({ template: '<div>resolved</div>', height: 320 });
    generateEsql.mockReset();
    generateEsql.mockResolvedValue('FROM logs-* | STATS count = COUNT(*) BY host');
  });

  describe('new panels', () => {
    it('generates a template from the query', async () => {
      const result = await resolve(addRequest());

      expect(resolveTemplate).toHaveBeenCalledWith({ prompt: 'Show KPI', esqlQuery: undefined });
      expect(result).toEqual({
        type: 'success',
        panelContent: {
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { esql_query: undefined, template: '<div>resolved</div>' },
        },
      });
    });

    it('samples and stores the ES|QL query when present', async () => {
      const result = await resolve(addRequest({ esql: 'FROM logs-* | STATS count = COUNT(*)' }));

      expect(resolveTemplate).toHaveBeenCalledWith({
        prompt: 'Show KPI',
        esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
      });
      expect(result).toMatchObject({
        panelContent: { config: { esql_query: ['FROM logs-* | STATS count = COUNT(*)'] } },
      });
    });

    it('does not generate a query when hasData is false', async () => {
      await resolve(addRequest({ hasData: false }));

      expect(generateEsql).not.toHaveBeenCalled();
      expect(resolveTemplate).toHaveBeenCalledWith({ prompt: 'Show KPI', esqlQuery: undefined });
    });

    it('generates, samples and stores a query when hasData is true', async () => {
      const result = await resolve(addRequest({ hasData: true, index: 'logs-*' }));

      expect(generateEsql).toHaveBeenCalledWith({
        nlQuery: 'Show KPI',
        index: 'logs-*',
        existingQueries: [],
      });
      expect(resolveTemplate).toHaveBeenCalledWith({
        prompt: 'Show KPI',
        esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY host',
      });
      expect(result).toMatchObject({
        panelContent: {
          config: { esql_query: ['FROM logs-* | STATS count = COUNT(*) BY host'] },
        },
      });
    });

    it('uses an explicit query instead of generating one', async () => {
      await resolve(addRequest({ esql: 'FROM metrics-*', hasData: true }));

      expect(generateEsql).not.toHaveBeenCalled();
      expect(resolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: 'FROM metrics-*' })
      );
    });

    it('fails the panel, without a template, when the query cannot be generated', async () => {
      generateEsql.mockRejectedValue(new Error('Could not generate an ES|QL query for this panel'));

      const result = await resolve(addRequest({ hasData: true }));

      expect(resolveTemplate).not.toHaveBeenCalled();
      expect(result).toEqual({
        type: 'failure',
        error: 'Could not generate an ES|QL query for this panel',
      });
    });

    it('returns a failure when template generation throws', async () => {
      resolveTemplate.mockRejectedValue(
        new Error('Generated template was rejected: contains a <script> tag.')
      );

      const result = await resolve(addRequest());

      expect(result).toEqual({
        type: 'failure',
        error: 'Generated template was rejected: contains a <script> tag.',
      });
    });
  });

  describe('edits', () => {
    it('refines the existing template and keeps the existing query without re-sampling it', async () => {
      const result = await resolve(
        editRequest(
          customContentPanel({ template: '<div>old</div>', esql_query: ['FROM logs-*'] }),
          { nlQuery: 'Updated' }
        )
      );

      expect(resolveTemplate).toHaveBeenCalledWith({
        prompt: 'Updated',
        esqlQuery: undefined,
        existingTemplate: '<div>old</div>',
        hasExistingQuery: true,
      });
      expect(result).toMatchObject({
        panelContent: { config: { esql_query: ['FROM logs-*'], template: '<div>resolved</div>' } },
      });
    });

    it('keeps the settings of the panel that are not the query or the template', async () => {
      const timeRange = { from: 'now-7d', to: 'now' };

      const result = await resolve(
        editRequest(
          customContentPanel({
            template: '<div>old</div>',
            esql_query: ['FROM logs-*'],
            title: 'Errors by host',
            description: 'Last week',
            time_range: timeRange,
          }),
          { nlQuery: 'Make the badges blue' }
        )
      );

      expect(result).toMatchObject({
        panelContent: {
          config: {
            title: 'Errors by host',
            description: 'Last week',
            time_range: timeRange,
            esql_query: ['FROM logs-*'],
            template: '<div>resolved</div>',
          },
        },
      });
    });

    it('drops the query but keeps the other settings when the edit removes it', async () => {
      const result = await resolve(
        editRequest(
          customContentPanel({
            template: '<div>old</div>',
            esql_query: ['FROM logs-*'],
            title: 'Errors by host',
          }),
          { esql: null }
        )
      );

      expect(result).toMatchObject({
        panelContent: { config: { title: 'Errors by host', esql_query: undefined } },
      });
    });

    it('resolves from the existing template when the edit carries no query', async () => {
      await resolve(
        editRequest(customContentPanel({ template: '<div>old</div>' }), {
          esql: 'FROM metrics-*',
        })
      );

      expect(resolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: '', existingTemplate: '<div>old</div>' })
      );
    });

    it('samples a replaced query', async () => {
      const result = await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*'] }), {
          esql: 'FROM metrics-*',
        })
      );

      expect(resolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: 'FROM metrics-*', hasExistingQuery: false })
      );
      expect(result).toMatchObject({
        panelContent: { config: { esql_query: ['FROM metrics-*'] } },
      });
    });

    it('does not generate a query for a style-only edit', async () => {
      await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*'], template: '<div/>' }), {
          nlQuery: 'Make the badges blue',
        })
      );

      expect(generateEsql).not.toHaveBeenCalled();
    });

    it('regenerates the query from the existing one when regenerateESQL is set', async () => {
      const result = await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*'], template: '<div/>' }), {
          nlQuery: 'Also show the error rate',
          regenerateESQL: true,
          index: 'logs-*',
        })
      );

      expect(generateEsql).toHaveBeenCalledWith({
        nlQuery: 'Also show the error rate',
        index: 'logs-*',
        existingQueries: ['FROM logs-*'],
      });
      expect(resolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY host',
          hasExistingQuery: false,
        })
      );
      expect(result).toMatchObject({
        panelContent: {
          config: { esql_query: ['FROM logs-* | STATS count = COUNT(*) BY host'] },
        },
      });
    });

    it('lets an explicit query win over regenerateESQL', async () => {
      await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*'] }), {
          nlQuery: 'Change the data',
          regenerateESQL: true,
          esql: 'FROM metrics-*',
        })
      );

      expect(generateEsql).not.toHaveBeenCalled();
      expect(resolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: 'FROM metrics-*' })
      );
    });

    it('generates a query for a static panel when hasData is true', async () => {
      await resolve(
        editRequest(customContentPanel({ template: '<div>banner</div>' }), {
          nlQuery: 'Show request counts per host',
          hasData: true,
        })
      );

      expect(generateEsql).toHaveBeenCalledWith(
        expect.objectContaining({ nlQuery: 'Show request counts per host', existingQueries: [] })
      );
    });

    it('keeps the stored query when hasData is true and the panel already has one', async () => {
      await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*'], template: '<div/>' }), {
          nlQuery: 'Restyle',
          hasData: true,
        })
      );

      expect(generateEsql).not.toHaveBeenCalled();
    });

    it('removes the query when hasData is false', async () => {
      const result = await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*'] }), {
          nlQuery: 'Make it a static banner',
          hasData: false,
        })
      );

      expect(result).toMatchObject({ panelContent: { config: { esql_query: undefined } } });
    });

    it('removes the query when esql is null', async () => {
      const result = await resolve(
        editRequest(customContentPanel({ esql_query: ['FROM logs-*'] }), { esql: null })
      );

      expect(resolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: undefined, hasExistingQuery: false })
      );
      expect(result).toMatchObject({ panelContent: { config: { esql_query: undefined } } });
    });
  });
});
