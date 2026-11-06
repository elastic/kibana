/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet } from '@kbn/core/server';
import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import type { ActionsRequestHandlerContext } from '../../types';
import { verifyAccessAndContext } from '../verify_access_and_context';
import { dynamicConnectorTypesRoutes } from './dynamic_types';

jest.mock('../verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

describe('dynamicConnectorTypesRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessAndContext as jest.Mock).mockImplementation((_license, handler) => handler);
  });

  it('requires superuser authorization and validates safe editable fields', () => {
    const router = httpServiceMock.createRouter();
    dynamicConnectorTypesRoutes(router, licenseStateMock.create());

    const [definitionConfig] = router.get.mock.calls[0];
    const [listConfig] = router.get.mock.calls[1];
    const [editableConfig] = router.put.mock.calls[0];
    for (const config of [definitionConfig, listConfig, editableConfig]) {
      expect(config.security).toEqual({
        authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
      });
      expect(config.options?.access).toBe('internal');
    }

    const validation = editableConfig.validate as unknown as {
      request: {
        body: { parse: (input: unknown) => unknown };
        params: { validate: (input: unknown) => unknown };
      };
    };
    expect(
      validation.request.body.parse({
        displayName: 'Updated',
        description: 'Info',
        testEnabled: false,
      })
    ).toEqual({
      displayName: 'Updated',
      description: 'Info',
      testEnabled: false,
    });
    expect(() =>
      validation.request.body.parse({
        displayName: 'Updated',
        description: 'Info',
        testEnabled: false,
        auth: { types: ['none'] },
      })
    ).toThrow();
    expect(() =>
      validation.request.body.parse({ displayName: '', description: '', testEnabled: false })
    ).toThrow();
    expect(() =>
      validation.request.body.parse({
        displayName: 'Updated',
        description: 'Info',
        testEnabled: true,
      })
    ).toThrow();
    expect(validation.request.params.validate({ id: '.dynamic' })).toEqual({ id: '.dynamic' });
  });

  it('updates metadata and the connection test through the actions request context', async () => {
    const router = httpServiceMock.createRouter();
    dynamicConnectorTypesRoutes(router, licenseStateMock.create());
    const updateDynamicConnectorTypeEditable = jest.fn();
    const context = {
      actions: Promise.resolve({ updateDynamicConnectorTypeEditable }),
    } as unknown as ActionsRequestHandlerContext;
    const test = { description: 'Check API', request: { method: 'GET', url: 'https://api.test' } };
    const body = {
      displayName: 'Dynamic',
      description: '',
      testEnabled: true,
      test,
    };
    const request = { params: { id: '.dynamic' }, body };
    const response = httpServerMock.createResponseFactory();
    const [, handler] = router.put.mock.calls[0];

    await handler(context, request as never, response);

    expect(updateDynamicConnectorTypeEditable).toHaveBeenCalledWith('.dynamic', body);
    expect(response.ok).toHaveBeenCalledWith({ body: { id: '.dynamic' } });
  });

  it('returns the stored definition through the actions request context', async () => {
    const router = httpServiceMock.createRouter();
    dynamicConnectorTypesRoutes(router, licenseStateMock.create());
    const definition = { id: 'acme', displayName: 'Acme' };
    const getDynamicConnectorTypeDefinition = jest.fn(() => definition);
    const context = {
      actions: Promise.resolve({ getDynamicConnectorTypeDefinition }),
    } as unknown as ActionsRequestHandlerContext;
    const response = httpServerMock.createResponseFactory();
    const [, handler] = router.get.mock.calls[0];

    await handler(context, { params: { id: '.acme' } } as never, response);

    expect(getDynamicConnectorTypeDefinition).toHaveBeenCalledWith('.acme');
    expect(response.ok).toHaveBeenCalledWith({ body: definition });
  });
});
