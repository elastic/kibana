/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { createTemplatesSubClient } from './client';
import type { Template } from '../../../common/types/domain/template/latest';
import type { TemplatesFindRequest } from '../../../common/types/api/template/v1';

describe('templates client', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();

  const createTemplateSavedObject = (owner: string, id = 'template-so-id'): SavedObject<Template> =>
    ({
      id,
      attributes: {
        templateId: 'template-1',
        name: 'Template One',
        owner,
        definition: '',
        templateVersion: 1,
        deletedAt: null,
      },
    } as SavedObject<Template>);

  const findRequest = (overrides: Partial<TemplatesFindRequest> = {}): TemplatesFindRequest => ({
    page: 1,
    perPage: 20,
    sortField: 'name',
    sortOrder: 'asc',
    search: '',
    tags: [],
    author: [],
    owner: [],
    isDeleted: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTemplates', () => {
    it('does not restrict by owner when security is disabled (authorizedOwners undefined)', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        filter: undefined,
        ensureSavedObjectsAreAuthorized: () => {},
        authorizedOwners: undefined,
      });
      clientArgs.services.templatesService.getAllTemplates.mockResolvedValueOnce({
        templates: [],
        page: 1,
        perPage: 20,
        total: 0,
      });

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      const params = findRequest();
      await subClient.getAllTemplates(params);

      expect(clientArgs.services.templatesService.getAllTemplates).toHaveBeenCalledWith(params);
    });

    it('defaults to the authorized owners when the caller does not request a specific owner', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        filter: undefined,
        ensureSavedObjectsAreAuthorized: () => {},
        authorizedOwners: ['securitySolution', 'observability'],
      });
      clientArgs.services.templatesService.getAllTemplates.mockResolvedValueOnce({
        templates: [],
        page: 1,
        perPage: 20,
        total: 0,
      });

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      await subClient.getAllTemplates(findRequest());

      expect(clientArgs.services.templatesService.getAllTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ owner: ['securitySolution', 'observability'] })
      );
    });

    it('intersects the requested owner with the authorized owners', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        filter: undefined,
        ensureSavedObjectsAreAuthorized: () => {},
        authorizedOwners: ['securitySolution'],
      });
      clientArgs.services.templatesService.getAllTemplates.mockResolvedValueOnce({
        templates: [],
        page: 1,
        perPage: 20,
        total: 0,
      });

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      await subClient.getAllTemplates(
        findRequest({ owner: ['securitySolution', 'observability'] })
      );

      expect(clientArgs.services.templatesService.getAllTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ owner: ['securitySolution'] })
      );
    });

    it('returns an empty result without querying the service when the caller has no authorized owners in common', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        filter: undefined,
        ensureSavedObjectsAreAuthorized: () => {},
        authorizedOwners: ['observability'],
      });

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      const result = await subClient.getAllTemplates(
        findRequest({ owner: ['securitySolution'], page: 2, perPage: 10 })
      );

      expect(clientArgs.services.templatesService.getAllTemplates).not.toHaveBeenCalled();
      expect(result).toEqual({ templates: [], page: 2, perPage: 10, total: 0 });
    });
  });

  describe('getTemplate', () => {
    it('returns undefined without checking authorization when the template does not exist', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(undefined);

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      const result = await subClient.getTemplate('unknown-id');

      expect(result).toBeUndefined();
      expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
    });

    it('authorizes the request using the template owner before returning it', async () => {
      const template = createTemplateSavedObject('securitySolution');
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      const result = await subClient.getTemplate('template-1');

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: expect.objectContaining({ action: 'case_template_get' }),
        entities: [{ owner: 'securitySolution', id: template.id }],
      });
      expect(result).toBe(template);
    });

    it('propagates the forbidden error when the caller is not authorized for the template owner', async () => {
      const template = createTemplateSavedObject('observability');
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);
      clientArgs.authorization.ensureAuthorized.mockRejectedValueOnce(
        Boom.forbidden('Unauthorized to access template')
      );

      const subClient = createTemplatesSubClient(clientArgs, casesClient);

      await expect(subClient.getTemplate('template-1')).rejects.toThrow(
        'Unauthorized to access template'
      );
    });
  });

  describe('deleteTemplate', () => {
    const foundCases = (ids: string[], total = ids.length) =>
      ({
        saved_objects: ids.map((id) => ({ id, version: `v-${id}` })),
        total,
        page: 1,
        per_page: 100,
      } as unknown as Awaited<ReturnType<typeof clientArgs.services.caseService.findCases>>);

    it('unlinks referencing cases (clearing template, keeping fields) before soft-deleting', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(
        createTemplateSavedObject('securitySolution')
      );
      clientArgs.services.caseService.findCases.mockResolvedValueOnce(
        foundCases(['case-1', 'case-2'])
      );

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      await subClient.deleteTemplate('template-1');

      // Each referencing case is patched with template: null and no extended_fields, so values are
      // preserved and a removed-template user action is recorded.
      expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith({
        cases: [
          { id: 'case-1', version: 'v-case-1', template: null },
          { id: 'case-2', version: 'v-case-2', template: null },
        ],
      });
      expect(clientArgs.services.templatesService.deleteTemplate).toHaveBeenCalledWith(
        'template-1'
      );
    });

    it('soft-deletes without unlinking when no case references the template', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(
        createTemplateSavedObject('securitySolution')
      );
      clientArgs.services.caseService.findCases.mockResolvedValueOnce(foundCases([]));

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      await subClient.deleteTemplate('template-1');

      expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
      expect(clientArgs.services.templatesService.deleteTemplate).toHaveBeenCalledWith(
        'template-1'
      );
    });

    it('throws notFound and neither unlinks nor deletes when the template does not exist', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(undefined);

      const subClient = createTemplatesSubClient(clientArgs, casesClient);

      await expect(subClient.deleteTemplate('missing')).rejects.toThrow(
        'Template with id missing not found'
      );
      expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
      expect(clientArgs.services.templatesService.deleteTemplate).not.toHaveBeenCalled();
    });
  });

  describe('getCasesUsingTemplates', () => {
    it('returns an empty result without querying when no template ids are given', async () => {
      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      const result = await subClient.getCasesUsingTemplates([]);

      expect(result).toEqual({ total: 0, cases: [] });
      expect(clientArgs.services.caseService.findCases).not.toHaveBeenCalled();
    });

    it('returns the total and a mapped id/title list scoped by the cases authorization filter', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValueOnce({
        filter: { type: 'function', function: 'is', arguments: [] },
        ensureSavedObjectsAreAuthorized: () => {},
        authorizedOwners: ['securitySolution'],
      });
      clientArgs.services.caseService.findCases.mockResolvedValueOnce({
        saved_objects: [
          { id: 'case-1', attributes: { title: 'Case One' } },
          { id: 'case-2', attributes: { title: 'Case Two' } },
        ],
        total: 5,
        page: 1,
        per_page: 100,
      } as unknown as Awaited<ReturnType<typeof clientArgs.services.caseService.findCases>>);

      const subClient = createTemplatesSubClient(clientArgs, casesClient);
      const result = await subClient.getCasesUsingTemplates(['tpl-1']);

      // total may exceed the listed cases (list is capped for display).
      expect(result).toEqual({
        total: 5,
        cases: [
          { id: 'case-1', title: 'Case One' },
          { id: 'case-2', title: 'Case Two' },
        ],
      });
      expect(clientArgs.services.caseService.findCases).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, perPage: 100 })
      );
    });
  });
});
