/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet } from '@kbn/core/server';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../_mock_handler_arguments';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { createConnectorTypeRoute } from './create_connector_type';
import { createConnectorTypeRequestSchemaV1 } from '../../../../common/routes/connector/apis/create_type';

jest.mock('../../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

const validBody = {
  id: '.dynamic_type',
  displayName: 'Dynamic type',
  description: 'A connector type created at runtime.',
  config: [],
  auth: { type: 'none' },
  actions: {
    getItem: {
      description: 'Get one item.',
      scope: 'read',
      input: [],
      request: { method: 'GET', url: 'https://example.test/items' },
    },
  },
};

describe('createConnectorTypeRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessAndContext as jest.Mock).mockImplementation((_license, handler) => handler);
  });

  it('requires superuser authorization and validates request bodies', () => {
    const router = httpServiceMock.createRouter();
    createConnectorTypeRoute(router, licenseStateMock.create());
    const [config] = router.post.mock.calls[0];

    expect(config.path).toBe('/api/actions/connector_types');
    expect(config.security).toEqual({
      authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
    });
    const validation = config.validate as unknown as {
      request: { body: typeof createConnectorTypeRequestSchemaV1 };
      response: { 200: { body: () => typeof createConnectorTypeRequestSchemaV1 } };
    };
    expect(validation.request.body).toBe(createConnectorTypeRequestSchemaV1);
    expect(validation.request.body.safeParse(validBody).success).toBe(true);
    expect(validation.request.body.safeParse({}).success).toBe(false);
  });

  it('delegates registration to the request ActionsClient', async () => {
    const router = httpServiceMock.createRouter();
    createConnectorTypeRoute(router, licenseStateMock.create());
    const createConnectorType = jest.fn().mockResolvedValue({ id: '.dynamic_type' });
    const [, handler] = router.post.mock.calls[0];
    const [context, request, response] = mockHandlerArguments(
      { actionsClient: { createConnectorType } as never },
      { body: validBody },
      ['ok']
    );

    await handler(context, request, response);

    expect(createConnectorType).toHaveBeenCalledWith({ request: validBody });
    expect(response.ok).toHaveBeenCalledWith({ body: { id: '.dynamic_type' } });
  });
});
