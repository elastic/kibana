/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { CustomContentPanelResolutionRequest } from '../operations/panels';
import { createCustomContentPanelResolver } from './custom_content_panel_resolver';

const grid = { x: 0, y: 0, w: 12, h: 5 };

const customContentPanel = (config: Record<string, unknown>): AttachmentPanel => ({
  id: 'cc-1',
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  config,
  grid,
});

const addRequest = (
  overrides: Partial<CustomContentPanelResolutionRequest> = {}
): CustomContentPanelResolutionRequest => ({
  renderer: 'custom_content',
  operationType: 'add_panels',
  identifier: 'Show KPI',
  nlQuery: 'Show KPI',
  ...overrides,
});

const editRequest = (
  existingPanel: AttachmentPanel,
  overrides: Partial<CustomContentPanelResolutionRequest> = {}
): CustomContentPanelResolutionRequest => ({
  renderer: 'custom_content',
  operationType: 'edit_panels',
  identifier: existingPanel.id,
  existingPanel,
  ...overrides,
});

describe('createCustomContentPanelResolver', () => {
  const resolveTemplate = jest.fn();
  const resolve = createCustomContentPanelResolver({ resolveTemplate });

  beforeEach(() => {
    resolveTemplate.mockReset();
    resolveTemplate.mockResolvedValue({ template: '<div>resolved</div>', height: 320 });
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

    it('returns a failure attributed to the operation when template generation throws', async () => {
      resolveTemplate.mockRejectedValue(
        new Error('Generated template was rejected: contains a <script> tag.')
      );

      const result = await resolve(addRequest({ operationType: 'add_section' }));

      expect(result).toEqual({
        type: 'failure',
        failure: {
          type: 'add_section',
          identifier: 'Show KPI',
          error: 'Generated template was rejected: contains a <script> tag.',
        },
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
