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

  describe('mutation authorization (no existence oracle)', () => {
    it.each(['updateTemplate', 'deleteTemplate'] as const)(
      '%s rethrows a manage-authorization failure as 404 for a caller with no template read access',
      async (method) => {
        const template = createTemplateSavedObject('securitySolution');
        clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);
        // Both manageTemplate and the getTemplate fallback fail -> the id must look nonexistent.
        clientArgs.authorization.ensureAuthorized
          .mockRejectedValueOnce(Boom.forbidden('no manage'))
          .mockRejectedValueOnce(Boom.forbidden('no read'));

        const subClient = createTemplatesSubClient(clientArgs);

        await expect(
          method === 'updateTemplate'
            ? subClient.updateTemplate('template-1', {
                name: 'n',
                owner: 'securitySolution',
                definition: '',
              })
            : subClient.deleteTemplate('template-1')
        ).rejects.toMatchObject({ output: { statusCode: 404 } });
      }
    );

    it.each(['updateTemplate', 'deleteTemplate'] as const)(
      '%s keeps the honest 403 for a caller who can read but not manage templates',
      async (method) => {
        const template = createTemplateSavedObject('securitySolution');
        clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);
        clientArgs.authorization.ensureAuthorized
          .mockRejectedValueOnce(Boom.forbidden('no manage'))
          .mockResolvedValueOnce(undefined); // read succeeds

        const subClient = createTemplatesSubClient(clientArgs);

        await expect(
          method === 'updateTemplate'
            ? subClient.updateTemplate('template-1', {
                name: 'n',
                owner: 'securitySolution',
                definition: '',
              })
            : subClient.deleteTemplate('template-1')
        ).rejects.toMatchObject({ output: { statusCode: 403 } });
      }
    );

    it('hides existence using the REQUEST id so the 404 is indistinguishable from a missing id', async () => {
      // Stored template resolves under a different internal templateId than the request used. The
      // hide-existence 404 must echo the request id (like the missing-id 404), never the stored one,
      // or the differing message leaks that the template exists.
      const template = createTemplateSavedObject('securitySolution');
      template.attributes.templateId = 'internal-stored-id';
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);
      clientArgs.authorization.ensureAuthorized
        .mockRejectedValueOnce(Boom.forbidden('no manage'))
        .mockRejectedValueOnce(Boom.forbidden('no read'));

      const subClient = createTemplatesSubClient(clientArgs);

      await expect(subClient.deleteTemplate('requested-id')).rejects.toThrow(
        'Template with id requested-id not found'
      );
    });

    it('updateTemplate requires manage rights on the TARGET owner when the owner changes', async () => {
      const template = createTemplateSavedObject('securitySolution');
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);
      clientArgs.authorization.ensureAuthorized
        .mockResolvedValueOnce(undefined) // manage on current owner
        .mockRejectedValueOnce(Boom.forbidden('no manage on target owner'));

      const subClient = createTemplatesSubClient(clientArgs);

      await expect(
        subClient.updateTemplate('template-1', {
          name: 'n',
          owner: 'observability',
          definition: '',
        })
      ).rejects.toThrow('no manage on target owner');
      expect(clientArgs.services.templatesService.updateTemplate).not.toHaveBeenCalled();
    });
  });

  describe('dry-run validators', () => {
    it('validateCreateTemplate authorizes manageTemplate and runs the write preflight without writing', async () => {
      const subClient = createTemplatesSubClient(clientArgs);
      const input = { name: 'New Template', owner: 'securitySolution', definition: '' };

      await subClient.validateCreateTemplate(input);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: [expect.objectContaining({ owner: 'securitySolution' })],
        })
      );
      expect(clientArgs.services.templatesService.validateWriteInput).toHaveBeenCalledWith(input);
      expect(clientArgs.services.templatesService.createTemplate).not.toHaveBeenCalled();
    });

    it('validateUpdateTemplate 404s on a missing template and excludes the template from the name check', async () => {
      const subClient = createTemplatesSubClient(clientArgs);
      const input = { name: 'Renamed', owner: 'securitySolution', definition: '' };

      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(undefined);
      await expect(subClient.validateUpdateTemplate('missing', input)).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      const template = createTemplateSavedObject('securitySolution');
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);
      await subClient.validateUpdateTemplate('template-1', input);

      expect(clientArgs.services.templatesService.validateWriteInput).toHaveBeenCalledWith(input, {
        excludeTemplateId: 'template-1',
        currentOwner: 'securitySolution',
      });
      expect(clientArgs.services.templatesService.updateTemplate).not.toHaveBeenCalled();
    });

    it('validateUpdateTemplate mirrors the real update: owner change requires manage rights on the TARGET owner', async () => {
      const template = createTemplateSavedObject('securitySolution');
      clientArgs.services.templatesService.getTemplate.mockResolvedValueOnce(template);
      clientArgs.authorization.ensureAuthorized
        .mockResolvedValueOnce(undefined) // manage on current owner
        .mockRejectedValueOnce(Boom.forbidden('no manage on target owner'));

      const subClient = createTemplatesSubClient(clientArgs);

      await expect(
        subClient.validateUpdateTemplate('template-1', {
          name: 'n',
          owner: 'observability',
          definition: '',
        })
      ).rejects.toThrow('no manage on target owner');
      expect(clientArgs.services.templatesService.validateWriteInput).not.toHaveBeenCalled();
    });
  });
});
