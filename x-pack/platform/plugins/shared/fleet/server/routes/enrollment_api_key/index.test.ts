/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import { schema } from '@kbn/config-schema';

import type { FleetRequestHandlerContext } from '../..';

import { xpackMocks } from '../../mocks';
import {
  EnrollmentAPIKeySchema,
  EnrollmentAPIKeyResponseSchema,
  DeleteEnrollmentAPIKeyResponseSchema,
} from '../../types';

import { ListResponseSchema } from '../schema/utils';

import {
  getEnrollmentApiKeysHandler,
  getOneEnrollmentApiKeyHandler,
  deleteEnrollmentApiKeyHandler,
  postEnrollmentApiKeyHandler,
} from './handler';

jest.mock('./handler', () => ({
  ...jest.requireActual('./handler'),
  getEnrollmentApiKeysHandler: jest.fn(),
  getOneEnrollmentApiKeyHandler: jest.fn(),
  deleteEnrollmentApiKeyHandler: jest.fn(),
  postEnrollmentApiKeyHandler: jest.fn(),
}));

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  it('list enrollment api keys should return valid response', async () => {
    const testEnrollmentAPIKey = {
      id: 'id',
      name: 'name',
      active: true,
      api_key_id: 'api_key_id',
      api_key: 'api_key',
      policy_id: 'policy1',
      created_at: '2020-01-01',
    };
    const expectedResponse = {
      items: [testEnrollmentAPIKey],
      total: 1,
      page: 1,
      perPage: 20,
    };
    (getEnrollmentApiKeysHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getEnrollmentApiKeysHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = ListResponseSchema(EnrollmentAPIKeySchema).validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get enrollment api key should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'id',
        active: true,
        api_key_id: 'api_key_id',
        api_key: 'api_key',
        created_at: '2020-01-01',
      },
    };
    (getOneEnrollmentApiKeyHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getOneEnrollmentApiKeyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = EnrollmentAPIKeyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('delete enrollment api key should return valid response', async () => {
    const expectedResponse = {
      action: 'deleted',
    };
    (deleteEnrollmentApiKeyHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await deleteEnrollmentApiKeyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = DeleteEnrollmentAPIKeyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('create enrollment api key should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'id',
        active: true,
        api_key_id: 'api_key_id',
        api_key: 'api_key',
        created_at: '2020-01-01',
      },
      action: 'created',
    };
    (postEnrollmentApiKeyHandler as jest.Mock).mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await postEnrollmentApiKeyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = EnrollmentAPIKeyResponseSchema.extends({
      action: schema.literal('created'),
    }).validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
