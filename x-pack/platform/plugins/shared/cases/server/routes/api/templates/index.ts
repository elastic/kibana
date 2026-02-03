/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import yaml from 'js-yaml';
import {
  INTERNAL_TEMPLATE_DETAILS_URL,
  INTERNAL_TEMPLATES_URL,
  INTERNAL_BULK_DELETE_TEMPLATES_URL,
  INTERNAL_BULK_EXPORT_TEMPLATES_URL,
} from '../../../../common/constants';
import type {
  Template,
  ParsedTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  PatchTemplateInput,
} from '../../../../common/types/domain/template/v1';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { escapeHatch } from '../utils';

// Mock data store (simulates database)
const mockTemplates: Template[] = [
  {
    templateId: 'template-1',
    name: 'Security Incident Template',
    owner: 'securitySolution',
    definition: yaml.dump({
      fields: [
        {
          control: 'text',
          name: 'incident_type',
          label: 'Incident Type',
          type: 'keyword',
          default: 'malware installed on target host',
          metadata: { required: true },
        },
        {
          control: 'select',
          name: 'severity',
          label: 'Severity Level',
          type: 'keyword',
          metadata: { options: ['low', 'medium', 'high', 'critical'] },
        },
      ],
    }),
    templateVersion: 1,
    deletedAt: null,
  },
  {
    templateId: 'template-2',
    name: 'Observability Alert Template',
    owner: 'observability',
    definition: yaml.dump({
      fields: [
        {
          control: 'text',
          name: 'alert_source',
          label: 'Alert Source',
          type: 'keyword',
          metadata: {},
        },
      ],
    }),
    templateVersion: 2,
    deletedAt: null,
  },
  {
    templateId: 'template-3',
    name: 'Deleted Template',
    owner: 'securitySolution',
    definition: yaml.dump({ fields: [] }),
    templateVersion: 1,
    deletedAt: '2024-01-15T10:00:00.000Z',
  },
];

/**
 * Parse a raw template definition (YAML string) into a ParsedTemplate
 */
const parseTemplate = (template: Template): ParsedTemplate => {
  const parsedDefinition = ParsedTemplateDefinitionSchema.parse(yaml.load(template.definition));

  return {
    templateId: template.templateId,
    name: template.name,
    owner: template.owner,
    definition: parsedDefinition,
    templateVersion: template.templateVersion,
    deletedAt: template.deletedAt,
    isLatest: true,
    latestVersion: 1,
  };
};

/**
 * GET /internal/cases/templates
 * List all templates (excluding soft-deleted ones by default)
 */
export const getTemplatesRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get all case templates',
  },
  params: {
    query: schema.object({
      includeDeleted: schema.boolean({ defaultValue: false }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { includeDeleted } = request.query;

      const filteredTemplates = includeDeleted
        ? mockTemplates
        : mockTemplates.filter((t) => t.deletedAt === null);

      const parsedTemplates: ParsedTemplate[] = filteredTemplates.map((template) =>
        parseTemplate(template)
      );

      return response.ok({
        body: parsedTemplates,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get templates: ${error}`,
        error,
      });
    }
  },
});

/**
 * GET /internal/cases/templates/{template_id}
 * Get a single template by ID
 */
export const getTemplateRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get a case template by ID',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
    query: schema.object({
      version: schema.maybe(schema.number()),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;
      const { version } = request.query;

      // Find template by ID (and optionally version)
      const template = mockTemplates.find(
        (t) =>
          t.templateId === templateId &&
          t.deletedAt === null &&
          (version === undefined || t.templateVersion === version)
      );

      if (!template) {
        return response.notFound({
          body: { message: `Template with id ${templateId} not found` },
        });
      }

      const parsedTemplate = parseTemplate(template);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get template: ${error}`,
        error,
      });
    }
  },
});

/**
 * POST /internal/cases/templates
 * Create a new template
 */
export const postTemplateRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Create a new case template',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const input = request.body as CreateTemplateInput;

      // Validate YAML definition can be parsed
      try {
        yaml.load(input.definition);
      } catch (yamlError) {
        return response.badRequest({
          body: { message: `Invalid YAML definition: ${yamlError}` },
        });
      }

      // Generate new template ID and create template
      const newTemplateId = `template-${Date.now()}`;
      const newTemplate: Template = {
        templateId: newTemplateId,
        name: input.name,
        owner: input.owner,
        definition: input.definition,
        templateVersion: 1,
        deletedAt: null,
      };

      // Add to mock store
      mockTemplates.push(newTemplate);

      const parsedTemplate = parseTemplate(newTemplate);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create template: ${error}`,
        error,
      });
    }
  },
});

/**
 * PUT /internal/cases/templates/{template_id}
 * Full update of a template (creates a new version)
 */
export const putTemplateRoute = createCasesRoute({
  method: 'put',
  path: INTERNAL_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Update a case template (full replacement)',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;
      const input = request.body as UpdateTemplateInput;

      // Find the latest version of the template
      const existingVersions = mockTemplates.filter(
        (t) => t.templateId === templateId && t.deletedAt === null
      );

      if (existingVersions.length === 0) {
        return response.notFound({
          body: { message: `Template with id ${templateId} not found` },
        });
      }

      // Validate YAML definition
      try {
        yaml.load(input.definition);
      } catch (yamlError) {
        return response.badRequest({
          body: { message: `Invalid YAML definition: ${yamlError}` },
        });
      }

      const latestVersion = Math.max(...existingVersions.map((t) => t.templateVersion));

      // Create new version
      const updatedTemplate: Template = {
        templateId,
        name: input.name,
        owner: input.owner,
        definition: input.definition,
        templateVersion: latestVersion + 1,
        deletedAt: null,
      };

      mockTemplates.push(updatedTemplate);

      const parsedTemplate = parseTemplate(updatedTemplate);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update template: ${error}`,
        error,
      });
    }
  },
});

/**
 * PATCH /internal/cases/templates/{template_id}
 * Partial update of a template (creates a new version)
 */
export const patchTemplateRoute = createCasesRoute({
  method: 'patch',
  path: INTERNAL_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Partially update a case template',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;
      const input = request.body as PatchTemplateInput;

      // Find the latest version of the template
      const existingVersions = mockTemplates.filter(
        (t) => t.templateId === templateId && t.deletedAt === null
      );

      if (existingVersions.length === 0) {
        return response.notFound({
          body: { message: `Template with id ${templateId} not found` },
        });
      }

      const latestVersion = Math.max(...existingVersions.map((t) => t.templateVersion));
      const latestTemplate = existingVersions.find((t) => t.templateVersion === latestVersion);

      // Validate YAML definition if provided
      if (input.definition) {
        try {
          yaml.load(input.definition);
        } catch (yamlError) {
          return response.badRequest({
            body: { message: `Invalid YAML definition: ${yamlError}` },
          });
        }
      }

      // Create new version with merged fields
      const updatedTemplate: Template = {
        templateId,
        name: input.name ?? latestTemplate?.name ?? '',
        owner: input.owner ?? latestTemplate?.owner ?? '',
        definition: input.definition ?? latestTemplate?.definition ?? '',
        templateVersion: latestVersion + 1,
        deletedAt: null,
      };

      mockTemplates.push(updatedTemplate);

      const parsedTemplate = parseTemplate(updatedTemplate);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch template: ${error}`,
        error,
      });
    }
  },
});

/**
 * DELETE /internal/cases/templates/{template_id}
 * Soft delete a template (sets deletedAt timestamp)
 */
export const deleteTemplateRoute = createCasesRoute({
  method: 'delete',
  path: INTERNAL_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Delete a case template (soft delete)',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;

      // Find all versions of the template
      const templateVersions = mockTemplates.filter(
        (t) => t.templateId === templateId && t.deletedAt === null
      );

      if (templateVersions.length === 0) {
        return response.notFound({
          body: { message: `Template with id ${templateId} not found` },
        });
      }

      // Soft delete all versions by setting deletedAt
      const deletedAt = new Date().toISOString();
      templateVersions.forEach((template) => {
        template.deletedAt = deletedAt;
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete template with id ${request.params.template_id}: ${error}`,
        error,
      });
    }
  },
});

/**
 * POST /internal/cases/templates/_bulk_delete
 * Bulk soft delete templates by IDs
 */
export const bulkDeleteTemplatesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_DELETE_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: escapeHatch,
  },
  routerOptions: {
    access: 'internal',
    summary: 'Bulk delete case templates',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { ids } = request.body as { ids: string[] };

      if (!Array.isArray(ids) || ids.length === 0) {
        return response.badRequest({
          body: { message: 'ids must be a non-empty array of template IDs' },
        });
      }

      const deletedAt = new Date().toISOString();
      const notFound: string[] = [];

      for (const templateId of ids) {
        const templateVersions = mockTemplates.filter(
          (t) => t.templateId === templateId && t.deletedAt === null
        );

        if (templateVersions.length === 0) {
          notFound.push(templateId);
        } else {
          templateVersions.forEach((template) => {
            template.deletedAt = deletedAt;
          });
        }
      }

      if (notFound.length > 0) {
        return response.notFound({
          body: { message: `Templates not found: ${notFound.join(', ')}` },
        });
      }

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk delete templates: ${error}`,
        error,
      });
    }
  },
});

/**
 * POST /internal/cases/templates/_bulk_export
 * Bulk export templates by IDs
 */
export const bulkExportTemplatesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_EXPORT_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: escapeHatch,
  },
  routerOptions: {
    access: 'internal',
    summary: 'Bulk export case templates',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { ids } = request.body as { ids: string[] };

      if (!Array.isArray(ids) || ids.length === 0) {
        return response.badRequest({
          body: { message: 'ids must be a non-empty array of template IDs' },
        });
      }

      const templates = mockTemplates.filter(
        (t) => ids.includes(t.templateId) && t.deletedAt === null
      );

      const notFound = ids.filter((id) => !templates.some((t) => t.templateId === id));

      if (notFound.length > 0) {
        return response.notFound({
          body: { message: `Templates not found: ${notFound.join(', ')}` },
        });
      }

      const parsedTemplates: ParsedTemplate[] = templates.map((template) =>
        parseTemplate(template)
      );

      return response.ok({
        body: parsedTemplates,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk export templates: ${error}`,
        error,
      });
    }
  },
});
