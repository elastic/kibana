/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { createCasesClientMockArgs } from '../mocks';
import { createTemplatesSubClient } from './client';
import type { Template } from '../../../common/types/domain/template/latest';
import type { TemplatesFindRequest } from '../../../common/types/api/template/v1';

describe('templates client', () => {
  const clientArgs = createCasesClientMockArgs();

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

      const subClient = createTemplatesSubClient(clientArgs);
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

      const subClient = createTemplatesSubClient(clientArgs);
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

      const subClient = createTemplatesSubClient(clientArgs);
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

      const subClient = createTemplatesSubClient(clientArgs);
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

      const subClient = createTemplatesSubClient(clientArgs);
      const result = await subClient.getTemplate('unknown-id');

      expect(result).toBeUndefined();
      expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
    });

    it('authorizes the request using the template owner before returning it', async () => {
      const template = createTemplateSavedObject('securitySolution');
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);

      const subClient = createTemplatesSubClient(clientArgs);
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

      const subClient = createTemplatesSubClient(clientArgs);

      await expect(subClient.getTemplate('template-1')).rejects.toThrow(
        'Unauthorized to access template'
      );
    });
  });
});
