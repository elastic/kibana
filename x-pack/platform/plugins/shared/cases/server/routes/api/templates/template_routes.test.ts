/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import type { Template } from '../../../../common/types/domain/template/v1';
import { mockTemplates } from './mock_data';
import { getTemplatesRoute } from './get_templates_route';
import { getTemplateRoute } from './get_template_route';
import { postTemplateRoute } from './post_template_route';
import { putTemplateRoute } from './put_template_route';
import { patchTemplateRoute } from './patch_template_route';
import { deleteTemplateRoute } from './delete_template_route';
import { bulkDeleteTemplatesRoute } from './bulk_delete_templates_route';
import { bulkExportTemplatesRoute } from './bulk_export_templates_route';

const validDefinition = yaml.dump({
  fields: [
    {
      control: 'INPUT_TEXT',
      name: 'test_field',
      label: 'Test Field',
      type: 'keyword',
      metadata: {},
    },
  ],
});

const createTestTemplates = (): Template[] => [
  {
    templateId: 'template-1',
    name: 'Template One',
    owner: 'securitySolution',
    definition: validDefinition,
    templateVersion: 1,
    deletedAt: null,
  },
  {
    templateId: 'template-2',
    name: 'Template Two',
    owner: 'observability',
    definition: validDefinition,
    templateVersion: 1,
    deletedAt: null,
  },
  {
    templateId: 'template-3',
    name: 'Deleted Template',
    owner: 'securitySolution',
    definition: validDefinition,
    templateVersion: 1,
    deletedAt: '2024-01-15T10:00:00.000Z',
  },
];

const createMockContext = () => ({
  cases: {
    getCasesClient: jest.fn().mockResolvedValue({}),
  },
});

const createMockResponse = () => ({
  ok: jest.fn(),
  notFound: jest.fn(),
  badRequest: jest.fn(),
  noContent: jest.fn(),
});

describe('Template Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTemplates.length = 0;
    mockTemplates.push(...createTestTemplates());
  });

  describe('GET /internal/cases/templates', () => {
    it('returns non-deleted templates by default', async () => {
      const context = createMockContext();
      const request = { query: { includeDeleted: false } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getTemplatesRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body).toHaveLength(2);
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ templateId: 'template-1', name: 'Template One' }),
          expect.objectContaining({ templateId: 'template-2', name: 'Template Two' }),
        ])
      );
    });

    it('includes deleted templates when includeDeleted is true', async () => {
      const context = createMockContext();
      const request = { query: { includeDeleted: true } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getTemplatesRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body).toHaveLength(3);
      expect(body).toEqual(
        expect.arrayContaining([expect.objectContaining({ templateId: 'template-3' })])
      );
    });
  });

  describe('GET /internal/cases/templates/{template_id}', () => {
    it('returns a template by ID', async () => {
      const context = createMockContext();
      const request = { params: { template_id: 'template-1' }, query: {} };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getTemplateRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            templateId: 'template-1',
            name: 'Template One',
            owner: 'securitySolution',
          }),
        })
      );
    });

    it('returns 404 for a non-existent template ID', async () => {
      const context = createMockContext();
      const request = { params: { template_id: 'non-existent' }, query: {} };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getTemplateRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Template with id non-existent not found' },
      });
    });

    it('returns 404 for a soft-deleted template', async () => {
      const context = createMockContext();
      const request = { params: { template_id: 'template-3' }, query: {} };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getTemplateRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Template with id template-3 not found' },
      });
    });

    it('returns a specific version when version query param is provided', async () => {
      // Add a second version of template-1
      mockTemplates.push({
        templateId: 'template-1',
        name: 'Template One v2',
        owner: 'securitySolution',
        definition: validDefinition,
        templateVersion: 2,
        deletedAt: null,
      });

      const context = createMockContext();
      const request = { params: { template_id: 'template-1' }, query: { version: 1 } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getTemplateRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            templateId: 'template-1',
            name: 'Template One',
            templateVersion: 1,
          }),
        })
      );
    });
  });

  describe('POST /internal/cases/templates', () => {
    it('creates a new template', async () => {
      const context = createMockContext();
      const request = {
        body: {
          name: 'New Template',
          owner: 'securitySolution',
          definition: validDefinition,
        },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postTemplateRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            name: 'New Template',
            owner: 'securitySolution',
            templateVersion: 1,
            deletedAt: null,
          }),
        })
      );
      expect(mockTemplates).toHaveLength(4);
    });

    it('returns the parsed definition in the response', async () => {
      const context = createMockContext();
      const request = {
        body: {
          name: 'New Template',
          owner: 'securitySolution',
          definition: validDefinition,
        },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postTemplateRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body.definition).toEqual({
        fields: [
          expect.objectContaining({
            control: 'INPUT_TEXT',
            name: 'test_field',
            type: 'keyword',
          }),
        ],
      });
    });
  });

  describe('PUT /internal/cases/templates/{template_id}', () => {
    it('fully updates a template and increments the version', async () => {
      const context = createMockContext();
      const request = {
        params: { template_id: 'template-1' },
        body: {
          name: 'Updated Template',
          owner: 'observability',
          definition: validDefinition,
        },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putTemplateRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            templateId: 'template-1',
            name: 'Updated Template',
            owner: 'observability',
            templateVersion: 2,
          }),
        })
      );
    });

    it('returns 404 for a non-existent template', async () => {
      const context = createMockContext();
      const request = {
        params: { template_id: 'non-existent' },
        body: {
          name: 'Updated',
          owner: 'securitySolution',
          definition: validDefinition,
        },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putTemplateRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Template with id non-existent not found' },
      });
    });

    it('returns 404 for a soft-deleted template', async () => {
      const context = createMockContext();
      const request = {
        params: { template_id: 'template-3' },
        body: {
          name: 'Updated',
          owner: 'securitySolution',
          definition: validDefinition,
        },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putTemplateRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Template with id template-3 not found' },
      });
    });
  });

  describe('PATCH /internal/cases/templates/{template_id}', () => {
    it('partially updates only the name and preserves other fields', async () => {
      const context = createMockContext();
      const request = {
        params: { template_id: 'template-1' },
        body: { name: 'Patched Name' },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await patchTemplateRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            templateId: 'template-1',
            name: 'Patched Name',
            owner: 'securitySolution',
            templateVersion: 2,
          }),
        })
      );
    });

    it('returns 404 for a non-existent template', async () => {
      const context = createMockContext();
      const request = {
        params: { template_id: 'non-existent' },
        body: { name: 'Patched' },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await patchTemplateRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Template with id non-existent not found' },
      });
    });
  });

  describe('DELETE /internal/cases/templates/{template_id}', () => {
    it('soft deletes a template by setting deletedAt', async () => {
      const context = createMockContext();
      const request = { params: { template_id: 'template-1' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await deleteTemplateRoute.handler({ context, request, response });

      expect(response.noContent).toHaveBeenCalled();
      const deleted = mockTemplates.find((t) => t.templateId === 'template-1');
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('returns 404 for a non-existent template', async () => {
      const context = createMockContext();
      const request = { params: { template_id: 'non-existent' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await deleteTemplateRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Template with id non-existent not found' },
      });
    });

    it('returns 404 for an already-deleted template', async () => {
      const context = createMockContext();
      const request = { params: { template_id: 'template-3' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await deleteTemplateRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Template with id template-3 not found' },
      });
    });
  });

  describe('POST /internal/cases/templates/_bulk_delete', () => {
    it('bulk soft deletes multiple templates', async () => {
      const context = createMockContext();
      const request = { body: { ids: ['template-1', 'template-2'] } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await bulkDeleteTemplatesRoute.handler({ context, request, response });

      expect(response.noContent).toHaveBeenCalled();
      expect(mockTemplates.find((t) => t.templateId === 'template-1')?.deletedAt).not.toBeNull();
      expect(mockTemplates.find((t) => t.templateId === 'template-2')?.deletedAt).not.toBeNull();
    });

    it('returns 404 when any template ID is not found', async () => {
      const context = createMockContext();
      const request = { body: { ids: ['template-1', 'non-existent'] } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await bulkDeleteTemplatesRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Templates not found: non-existent' },
      });
    });

    it('returns 400 when ids is empty', async () => {
      const context = createMockContext();
      const request = { body: { ids: [] } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await bulkDeleteTemplatesRoute.handler({ context, request, response });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: 'ids must be a non-empty array of template IDs' },
      });
    });
  });

  describe('POST /internal/cases/templates/_bulk_export', () => {
    it('exports templates by IDs', async () => {
      const context = createMockContext();
      const request = { body: { ids: ['template-1', 'template-2'] } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await bulkExportTemplatesRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body).toHaveLength(2);
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ templateId: 'template-1' }),
          expect.objectContaining({ templateId: 'template-2' }),
        ])
      );
    });

    it('returns 404 when any template ID is not found', async () => {
      const context = createMockContext();
      const request = { body: { ids: ['template-1', 'non-existent'] } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await bulkExportTemplatesRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Templates not found: non-existent' },
      });
    });

    it('excludes soft-deleted templates and returns 404', async () => {
      const context = createMockContext();
      const request = { body: { ids: ['template-3'] } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await bulkExportTemplatesRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: 'Templates not found: template-3' },
      });
    });

    it('returns 400 when ids is empty', async () => {
      const context = createMockContext();
      const request = { body: { ids: [] } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await bulkExportTemplatesRoute.handler({ context, request, response });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: 'ids must be a non-empty array of template IDs' },
      });
    });
  });
});
