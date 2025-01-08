/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../../types';
import { CheckPermissionsResponseSchema } from '../../types';

import { xpackMocks } from '../../mocks';

import {
  GenerateServiceTokenResponseSchema,
  generateServiceTokenHandler,
  getCheckPermissionsHandler,
} from '.';

jest.mock('../../services', () => ({
  appContextService: {
    getSecurityLicense: jest.fn().mockReturnValue({ isEnabled: jest.fn().mockReturnValue(false) }),
    getCloud: jest.fn().mockReturnValue({ isServerlessEnabled: false } as any),
    getExperimentalFeatures: jest.fn().mockReturnValue({ subfeaturePrivileges: false }),
    getLogger: jest.fn().mockReturnValue({ debug: jest.fn(), error: jest.fn() } as any),
  },
}));

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  it('check permissions should return valid response', async () => {
    const expectedResponse = {
      success: false,
      error: 'MISSING_SECURITY',
    };
    await getCheckPermissionsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = CheckPermissionsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('generate service token should return valid response', async () => {
    (
      (await context.core).elasticsearch.client.asCurrentUser.transport.request as jest.Mock
    ).mockResolvedValue({
      created: true,
      token: {
        name: 'token',
        value: 'value',
      },
    });
    const expectedResponse = {
      name: 'token',
      value: 'value',
    };
    await generateServiceTokenHandler(
      context,
      {
        body: {},
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GenerateServiceTokenResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
