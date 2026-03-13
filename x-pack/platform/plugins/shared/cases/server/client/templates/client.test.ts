/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { Operations, ReadOperations, WriteOperations } from '../../authorization';
import { createCasesClientMockArgs } from '../mocks';
import { createTemplatesSubClient } from './client';
import type { TemplatesFindRequest, TemplatesFindResponse } from '../../../common/types/api/template/v1';
import type { SavedObject } from '@kbn/core/server';
import type { Template } from '../../../common/types/domain/template/latest';

const mockFindRequest: TemplatesFindRequest = {
  page: 1,
  perPage: 10,
  sortField: 'name',
  sortOrder: 'asc',
  search: '',
  tags: [],
  author: [],
  owner: [],
  isDeleted: false,
};

const mockTemplateSO: SavedObject<Template> = {
  id: 'template-so-id',
  type: 'cases-templates',
  references: [],
  attributes: {
    templateId: 'template-id-1',
    owner: SECURITY_SOLUTION_OWNER,
    name: 'My Template',
    templateVersion: 1,
    isLatest: true,
    definition: 'name: My Template\nfields: []',
    deletedAt: null,
    fieldCount: 0,
    fieldNames: [],
    usageCount: 0,
    description: 'A test template',
    tags: [],
    author: 'damaged_raccoon',
  },
};

const mockFindResponse: TemplatesFindResponse = {
  templates: [{ ...mockTemplateSO.attributes, fieldSearchMatches: false }],
  total: 1,
  page: 1,
  perPage: 10,
};

describe('TemplatesSubClient', () => {
  let clientArgs: ReturnType<typeof createCasesClientMockArgs>;
  let client: ReturnType<typeof createTemplatesSubClient>;

  beforeEach(() => {
    clientArgs = createCasesClientMockArgs();
    client = createTemplatesSubClient(clientArgs);
    jest.clearAllMocks();
  });

  describe('getAllTemplates', () => {
    it('calls getAuthorizationFilter with GetAllTemplates operation', async () => {
      clientArgs.services.templatesService.getAllTemplates.mockResolvedValue(mockFindResponse);

      await client.getAllTemplates(mockFindRequest);

      expect(clientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledWith(
        Operations[ReadOperations.GetAllTemplates]
      );
    });

    it('throws when getAuthorizationFilter rejects', async () => {
      const error = new Error('Unauthorized');
      clientArgs.authorization.getAuthorizationFilter.mockRejectedValue(error);

      await expect(client.getAllTemplates(mockFindRequest)).rejects.toThrow('Unauthorized');
    });

    it('delegates to templatesService when authorized', async () => {
      clientArgs.services.templatesService.getAllTemplates.mockResolvedValue(mockFindResponse);

      const result = await client.getAllTemplates(mockFindRequest);

      expect(clientArgs.services.templatesService.getAllTemplates).toHaveBeenCalledWith(
        mockFindRequest
      );
      expect(result).toEqual(mockFindResponse);
    });
  });

  describe('getTemplate', () => {
    it('calls getAuthorizationFilter with GetAllTemplates operation', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);

      await client.getTemplate('template-id-1');

      expect(clientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledWith(
        Operations[ReadOperations.GetAllTemplates]
      );
    });

    it('calls ensureSavedObjectsAreAuthorized when result exists', async () => {
      const ensureSavedObjectsAreAuthorized = jest.fn();
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValue({
        filter: undefined,
        ensureSavedObjectsAreAuthorized,
      });
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);

      await client.getTemplate('template-id-1');

      expect(ensureSavedObjectsAreAuthorized).toHaveBeenCalledWith([
        { id: mockTemplateSO.id, owner: mockTemplateSO.attributes.owner },
      ]);
    });

    it('does not call ensureSavedObjectsAreAuthorized when result is undefined', async () => {
      const ensureSavedObjectsAreAuthorized = jest.fn();
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValue({
        filter: undefined,
        ensureSavedObjectsAreAuthorized,
      });
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(undefined);

      await client.getTemplate('missing-id');

      expect(ensureSavedObjectsAreAuthorized).not.toHaveBeenCalled();
    });

    it('propagates error from ensureSavedObjectsAreAuthorized', async () => {
      const error = new Error('Forbidden');
      const ensureSavedObjectsAreAuthorized = jest.fn().mockImplementation(() => {
        throw error;
      });
      clientArgs.authorization.getAuthorizationFilter.mockResolvedValue({
        filter: undefined,
        ensureSavedObjectsAreAuthorized,
      });
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);

      await expect(client.getTemplate('template-id-1')).rejects.toThrow('Forbidden');
    });

    it('throws when getAuthorizationFilter rejects', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockRejectedValue(new Error('Unauthorized'));

      await expect(client.getTemplate('template-id-1')).rejects.toThrow('Unauthorized');
    });
  });

  describe('createTemplate', () => {
    const input = {
      owner: SECURITY_SOLUTION_OWNER,
      definition: 'name: New Template\nfields: []',
      description: 'New template description',
      tags: [],
    };

    it('calls ensureAuthorized with ManageTemplate operation and input owner', async () => {
      clientArgs.services.templatesService.createTemplate.mockResolvedValue(mockTemplateSO);

      await client.createTemplate(input);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: Operations[WriteOperations.ManageTemplate],
          entities: expect.arrayContaining([
            expect.objectContaining({ owner: SECURITY_SOLUTION_OWNER }),
          ]),
        })
      );
    });

    it('throws when ensureAuthorized rejects', async () => {
      clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(client.createTemplate(input)).rejects.toThrow('Unauthorized');
    });

    it('delegates to templatesService when authorized', async () => {
      clientArgs.services.templatesService.createTemplate.mockResolvedValue(mockTemplateSO);

      const result = await client.createTemplate(input);

      expect(clientArgs.services.templatesService.createTemplate).toHaveBeenCalledWith(
        input,
        'damaged_raccoon'
      );
      expect(result).toEqual(mockTemplateSO);
    });
  });

  describe('updateTemplate', () => {
    const input = {
      owner: SECURITY_SOLUTION_OWNER,
      definition: 'name: Updated Template\nfields: []',
    };

    it('fetches existing template to obtain owner and calls ensureAuthorized', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);
      clientArgs.services.templatesService.updateTemplate.mockResolvedValue(mockTemplateSO);

      await client.updateTemplate('template-id-1', input);

      expect(clientArgs.services.templatesService.getTemplate).toHaveBeenCalledWith('template-id-1');
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: Operations[WriteOperations.ManageTemplate],
        entities: [{ owner: mockTemplateSO.attributes.owner, id: mockTemplateSO.id }],
      });
    });

    it('throws when ensureAuthorized rejects', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);
      clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(client.updateTemplate('template-id-1', input)).rejects.toThrow('Unauthorized');
    });

    it('throws 404 when template is not found', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(undefined);

      await expect(client.updateTemplate('missing-id', input)).rejects.toThrow(
        'Template with id missing-id does not exist'
      );
      expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
    });

    it('delegates to templatesService when authorized', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);
      clientArgs.services.templatesService.updateTemplate.mockResolvedValue(mockTemplateSO);

      const result = await client.updateTemplate('template-id-1', input);

      expect(clientArgs.services.templatesService.updateTemplate).toHaveBeenCalledWith(
        'template-id-1',
        input
      );
      expect(result).toEqual(mockTemplateSO);
    });
  });

  describe('deleteTemplate', () => {
    it('fetches existing template to obtain owner and calls ensureAuthorized', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);
      clientArgs.services.templatesService.deleteTemplate.mockResolvedValue(undefined);

      await client.deleteTemplate('template-id-1');

      expect(clientArgs.services.templatesService.getTemplate).toHaveBeenCalledWith('template-id-1');
      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: Operations[WriteOperations.ManageTemplate],
        entities: [{ owner: mockTemplateSO.attributes.owner, id: mockTemplateSO.id }],
      });
    });

    it('throws when ensureAuthorized rejects', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);
      clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(client.deleteTemplate('template-id-1')).rejects.toThrow('Unauthorized');
    });

    it('throws 404 when template is not found', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(undefined);

      await expect(client.deleteTemplate('missing-id')).rejects.toThrow(
        'Template with id missing-id does not exist'
      );
      expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
    });

    it('delegates to templatesService when authorized', async () => {
      clientArgs.services.templatesService.getTemplate.mockResolvedValue(mockTemplateSO);
      clientArgs.services.templatesService.deleteTemplate.mockResolvedValue(undefined);

      await client.deleteTemplate('template-id-1');

      expect(clientArgs.services.templatesService.deleteTemplate).toHaveBeenCalledWith(
        'template-id-1'
      );
    });
  });

  describe('getTags', () => {
    it('calls getAuthorizationFilter with GetAllTemplates operation', async () => {
      clientArgs.services.templatesService.getTags.mockResolvedValue(['tag1', 'tag2']);

      await client.getTags();

      expect(clientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledWith(
        Operations[ReadOperations.GetAllTemplates]
      );
    });

    it('throws when getAuthorizationFilter rejects', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockRejectedValue(new Error('Unauthorized'));

      await expect(client.getTags()).rejects.toThrow('Unauthorized');
    });

    it('delegates to templatesService when authorized', async () => {
      clientArgs.services.templatesService.getTags.mockResolvedValue(['tag1', 'tag2']);

      const result = await client.getTags();

      expect(result).toEqual(['tag1', 'tag2']);
    });
  });

  describe('getAuthors', () => {
    it('calls getAuthorizationFilter with GetAllTemplates operation', async () => {
      clientArgs.services.templatesService.getAuthors.mockResolvedValue(['user1', 'user2']);

      await client.getAuthors();

      expect(clientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledWith(
        Operations[ReadOperations.GetAllTemplates]
      );
    });

    it('throws when getAuthorizationFilter rejects', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockRejectedValue(new Error('Unauthorized'));

      await expect(client.getAuthors()).rejects.toThrow('Unauthorized');
    });

    it('delegates to templatesService when authorized', async () => {
      clientArgs.services.templatesService.getAuthors.mockResolvedValue(['user1', 'user2']);

      const result = await client.getAuthors();

      expect(result).toEqual(['user1', 'user2']);
    });
  });
});
