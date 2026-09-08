/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { stringify as yamlStringify } from 'yaml';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import {
  CASE_FIELD_DEFINITIONS_URL,
  CASE_FIELD_DEFINITION_DETAILS_URL,
} from '../../../../common/constants';
import { getPublicFieldDefinitionsRoute } from './get_public_field_definitions_route';
import { postPublicFieldDefinitionRoute } from './post_public_field_definition_route';
import { putPublicFieldDefinitionRoute } from './put_public_field_definition_route';
import { deletePublicFieldDefinitionRoute } from './delete_public_field_definition_route';
import { getPublicFieldDefinitionRoutes } from '.';

const buildDefinitionYaml = (name: string) =>
  yamlStringify({
    name,
    label: 'Priority',
    type: 'keyword',
    control: 'SELECT_BASIC',
    metadata: { options: ['low', 'medium', 'high'], default: 'medium' },
  });

const makeFieldDef = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  fieldDefinitionId: 'fd-1',
  name: 'priority',
  definition: buildDefinitionYaml('priority'),
  owner: 'cases',
  description: 'Priority level',
  isGlobal: false,
  // legacyKey deliberately omitted — public response must not include it
  ...overrides,
});

const toSavedObject = (fd: FieldDefinition) => ({ attributes: fd });

const createMockFieldDefinitionsClient = () => ({
  getFieldDefinitions: jest.fn(async () => ({
    fieldDefinitions: [makeFieldDef()],
    total: 1,
  })),
  createFieldDefinition: jest.fn(async () => toSavedObject(makeFieldDef())),
  updateFieldDefinition: jest.fn(async () =>
    toSavedObject(makeFieldDef({ description: 'Updated' }))
  ),
  deleteFieldDefinition: jest.fn(async () => undefined),
  getFieldDefinition: jest.fn(async () => toSavedObject(makeFieldDef())),
});

const createMockContext = (client = createMockFieldDefinitionsClient()) => ({
  cases: {
    getCasesClient: jest.fn().mockResolvedValue({ fieldDefinitions: client }),
  },
});

const createMockResponse = () => ({
  ok: jest.fn(),
  badRequest: jest.fn(),
  notFound: jest.fn(),
  conflict: jest.fn(),
  forbidden: jest.fn(),
  noContent: jest.fn(),
});

describe('Public Field Definition Routes', () => {
  describe('GET /api/cases/field_definitions', () => {
    it('returns paginated field definitions', async () => {
      const context = createMockContext();
      const request = { query: { owner: 'cases', page: 1, perPage: 20 } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getPublicFieldDefinitionsRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          fieldDefinitions: expect.arrayContaining([
            expect.objectContaining({ fieldDefinitionId: 'fd-1', name: 'priority' }),
          ]),
          page: 1,
          perPage: 20,
          total: 1,
        }),
      });
    });

    it('omits legacyKey from each definition in the response', async () => {
      const fdWithLegacyKey: FieldDefinition = { ...makeFieldDef(), legacyKey: 'custom-key-123' };
      const client = createMockFieldDefinitionsClient();
      client.getFieldDefinitions.mockResolvedValue({
        fieldDefinitions: [fdWithLegacyKey],
        total: 1,
      });
      const context = createMockContext(client);
      const request = { query: { owner: 'cases', page: 1, perPage: 20 } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getPublicFieldDefinitionsRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body.fieldDefinitions[0]).not.toHaveProperty('legacyKey');
    });

    it('filters by search term against name and description', async () => {
      const fds: FieldDefinition[] = [
        makeFieldDef({ fieldDefinitionId: 'a', name: 'priority', description: 'ticket priority' }),
        makeFieldDef({
          fieldDefinitionId: 'b',
          name: 'severity',
          description: 'incident severity',
        }),
      ];
      const client = createMockFieldDefinitionsClient();
      client.getFieldDefinitions.mockResolvedValue({ fieldDefinitions: fds, total: 2 });
      const context = createMockContext(client);
      const request = { query: { owner: 'cases', page: 1, perPage: 20, search: 'prio' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getPublicFieldDefinitionsRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body.fieldDefinitions).toHaveLength(1);
      expect(body.fieldDefinitions[0].fieldDefinitionId).toBe('a');
      expect(body.total).toBe(1);
    });

    it('sorts by name asc', async () => {
      const fds: FieldDefinition[] = [
        makeFieldDef({ fieldDefinitionId: 'b', name: 'severity' }),
        makeFieldDef({ fieldDefinitionId: 'a', name: 'priority' }),
      ];
      const client = createMockFieldDefinitionsClient();
      client.getFieldDefinitions.mockResolvedValue({ fieldDefinitions: fds, total: 2 });
      const context = createMockContext(client);
      const request = {
        query: { owner: 'cases', page: 1, perPage: 20, sortField: 'name', sortOrder: 'asc' },
      };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getPublicFieldDefinitionsRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body.fieldDefinitions[0].name).toBe('priority');
      expect(body.fieldDefinitions[1].name).toBe('severity');
    });

    it('paginates correctly', async () => {
      const fds: FieldDefinition[] = Array.from({ length: 5 }, (_, i) =>
        makeFieldDef({ fieldDefinitionId: `fd-${i}`, name: `field-${i}` })
      );
      const client = createMockFieldDefinitionsClient();
      client.getFieldDefinitions.mockResolvedValue({ fieldDefinitions: fds, total: 5 });
      const context = createMockContext(client);
      const request = { query: { owner: 'cases', page: 2, perPage: 2 } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getPublicFieldDefinitionsRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body.fieldDefinitions).toHaveLength(2);
      expect(body.page).toBe(2);
      expect(body.perPage).toBe(2);
      expect(body.total).toBe(5);
    });

    it('passes isGlobal filter through to the client', async () => {
      const client = createMockFieldDefinitionsClient();
      const context = createMockContext(client);
      const request = { query: { owner: 'cases', page: 1, perPage: 20, isGlobal: true } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await getPublicFieldDefinitionsRoute.handler({ context, request, response });

      expect(client.getFieldDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({ isGlobal: true })
      );
    });
  });

  describe('POST /api/cases/field_definitions', () => {
    const validBody = {
      name: 'priority',
      owner: 'cases',
      definition: buildDefinitionYaml('priority'),
      description: 'Priority level',
      isGlobal: false,
    };

    it('creates a field definition and returns the public shape', async () => {
      const context = createMockContext();
      const request = { body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ fieldDefinitionId: 'fd-1', name: 'priority' }),
      });
    });

    it('omits legacyKey from the response', async () => {
      const client = createMockFieldDefinitionsClient();
      client.createFieldDefinition.mockResolvedValue(
        toSavedObject({ ...makeFieldDef(), legacyKey: 'ck-1' })
      );
      const context = createMockContext(client);
      const request = { body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postPublicFieldDefinitionRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body).not.toHaveProperty('legacyKey');
    });

    it('returns 400 when body is invalid (extra unknown key)', async () => {
      const context = createMockContext();
      const request = { body: { ...validBody, displayOrder: 99 } }; // displayOrder is rejected
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.badRequest).toHaveBeenCalled();
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('returns 400 when name is an empty string', async () => {
      const context = createMockContext();
      const request = { body: { ...validBody, name: '' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.badRequest).toHaveBeenCalled();
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('returns 409 when client throws a Boom conflict', async () => {
      const client = createMockFieldDefinitionsClient();
      client.createFieldDefinition.mockRejectedValue(
        Boom.conflict('A field definition with name "priority" already exists for this owner.')
      );
      const context = createMockContext(client);
      const request = { body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.conflict).toHaveBeenCalled();
    });

    it('returns 403 when client throws a Boom forbidden', async () => {
      const client = createMockFieldDefinitionsClient();
      client.createFieldDefinition.mockRejectedValue(Boom.forbidden('Insufficient privileges'));
      const context = createMockContext(client);
      const request = { body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await postPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.forbidden).toHaveBeenCalled();
    });
  });

  describe('PUT /api/cases/field_definitions/{field_definition_id}', () => {
    const validBody = {
      name: 'priority',
      owner: 'cases',
      definition: buildDefinitionYaml('priority'),
      description: 'Updated priority level',
      isGlobal: false,
    };

    it('updates and returns the updated field definition', async () => {
      const context = createMockContext();
      const request = { params: { field_definition_id: 'fd-1' }, body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ fieldDefinitionId: 'fd-1', description: 'Updated' }),
      });
    });

    it('omits legacyKey from the response', async () => {
      const client = createMockFieldDefinitionsClient();
      client.updateFieldDefinition.mockResolvedValue(
        toSavedObject({ ...makeFieldDef(), legacyKey: 'ck-1' })
      );
      const context = createMockContext(client);
      const request = { params: { field_definition_id: 'fd-1' }, body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putPublicFieldDefinitionRoute.handler({ context, request, response });

      const body = response.ok.mock.calls[0][0].body;
      expect(body).not.toHaveProperty('legacyKey');
    });

    it('returns 400 when name is an empty string', async () => {
      const context = createMockContext();
      const request = { params: { field_definition_id: 'fd-1' }, body: { ...validBody, name: '' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.badRequest).toHaveBeenCalled();
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('returns 409 and preserves typed attributes when identity-immutable error is thrown', async () => {
      const client = createMockFieldDefinitionsClient();
      const identityImmutableError = Boom.conflict('Cannot change the name of field definition');
      identityImmutableError.output.statusCode = 409;
      // Simulate createTypedApiError data structure
      (identityImmutableError as unknown as { data: unknown }).data = {
        casesApiErrorAttributes: { code: 'field_identity_immutable', changed: ['name'] },
      };
      client.updateFieldDefinition.mockRejectedValue(identityImmutableError);
      const context = createMockContext(client);
      const request = { params: { field_definition_id: 'fd-1' }, body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.conflict).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            attributes: expect.objectContaining({ code: 'field_identity_immutable' }),
          }),
        })
      );
    });

    it('returns 404 when field definition is not found', async () => {
      const client = createMockFieldDefinitionsClient();
      client.updateFieldDefinition.mockRejectedValue(Boom.notFound('Field definition not found'));
      const context = createMockContext(client);
      const request = { params: { field_definition_id: 'fd-missing' }, body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalled();
    });

    it('returns 403 when client throws a Boom forbidden', async () => {
      const client = createMockFieldDefinitionsClient();
      client.updateFieldDefinition.mockRejectedValue(Boom.forbidden('Insufficient privileges'));
      const context = createMockContext(client);
      const request = { params: { field_definition_id: 'fd-1' }, body: validBody };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await putPublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.forbidden).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/cases/field_definitions/{field_definition_id}', () => {
    it('deletes the field definition and returns 204', async () => {
      const context = createMockContext();
      const request = { params: { field_definition_id: 'fd-1' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await deletePublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.noContent).toHaveBeenCalled();
    });

    it('returns 404 when field definition is not found', async () => {
      const client = createMockFieldDefinitionsClient();
      client.deleteFieldDefinition.mockRejectedValue(Boom.notFound('Field definition not found'));
      const context = createMockContext(client);
      const request = { params: { field_definition_id: 'fd-missing' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await deletePublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.notFound).toHaveBeenCalled();
    });

    it('returns 409 when field definition is referenced by active templates', async () => {
      const client = createMockFieldDefinitionsClient();
      client.deleteFieldDefinition.mockRejectedValue(
        Boom.conflict(
          'Cannot delete field definition "priority": it is referenced by 1 active template(s): "My Template"'
        )
      );
      const context = createMockContext(client);
      const request = { params: { field_definition_id: 'fd-1' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await deletePublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.conflict).toHaveBeenCalled();
    });

    it('returns 403 when client throws a Boom forbidden', async () => {
      const client = createMockFieldDefinitionsClient();
      client.deleteFieldDefinition.mockRejectedValue(Boom.forbidden('Insufficient privileges'));
      const context = createMockContext(client);
      const request = { params: { field_definition_id: 'fd-1' } };
      const response = createMockResponse();

      // @ts-expect-error: mocking necessary properties for handler logic only
      await deletePublicFieldDefinitionRoute.handler({ context, request, response });

      expect(response.forbidden).toHaveBeenCalled();
    });
  });

  describe('getPublicFieldDefinitionRoutes feature flag gating', () => {
    it('returns all public routes when templates.enabled is true', () => {
      const config = { templates: { enabled: true } } as unknown as Parameters<
        typeof getPublicFieldDefinitionRoutes
      >[0];
      const routes = getPublicFieldDefinitionRoutes(config);
      expect(routes).toHaveLength(4);
      expect(routes.map((route) => `${route.method.toUpperCase()} ${route.path}`)).toEqual([
        `GET ${CASE_FIELD_DEFINITIONS_URL}`,
        `POST ${CASE_FIELD_DEFINITIONS_URL}`,
        `PUT ${CASE_FIELD_DEFINITION_DETAILS_URL}`,
        `DELETE ${CASE_FIELD_DEFINITION_DETAILS_URL}`,
      ]);
    });

    it('returns empty array when templates.enabled is false', () => {
      const config = { templates: { enabled: false } } as unknown as Parameters<
        typeof getPublicFieldDefinitionRoutes
      >[0];
      const routes = getPublicFieldDefinitionRoutes(config);
      expect(routes).toHaveLength(0);
    });
  });
});
