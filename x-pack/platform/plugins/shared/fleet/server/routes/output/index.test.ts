/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../..';
import { outputService } from '../../services/output';

import { xpackMocks } from '../../mocks';
import type { Output } from '../../types';
import {
  DeleteOutputResponseSchema,
  GenerateLogstashApiKeyResponseSchema,
  GetLatestOutputHealthResponseSchema,
  GetOutputsResponseSchema,
  OutputResponseSchema,
} from '../../types';

import {
  deleteOutputHandler,
  getLatestOutputHealth,
  getOneOutputHandler,
  getOutputsHandler,
  postLogstashApiKeyHandler,
  postOutputHandler,
  putOutputHandler,
} from './handler';

vi.mock('../../services', () => {
      const mocked = {
      agentPolicyService: {
        bumpAllAgentPoliciesForOutput: vi.fn().mockResolvedValue({} as any),
      },
      appContextService: {
        getLogger: vi.fn().mockReturnValue({ error: vi.fn() } as any),
        getCloud: vi.fn().mockReturnValue({ isServerlessEnabled: false } as any),
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../services/output', () => {
      const mocked = {
      outputService: {
        list: vi.fn().mockResolvedValue({
          items: [
            {
              id: 'output1',
              type: 'elasticsearch',
              hosts: ['http://elasticsearch:9200'],
              is_default: true,
              is_default_monitoring: true,
              name: 'Default',
            },
          ],
          total: 1,
          page: 1,
          perPage: 20,
        }),
        create: vi.fn().mockResolvedValue({ id: 'output1' }),
        update: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ id: 'output1' }),
        delete: vi.fn().mockResolvedValue({}),
        getLatestOutputHealth: vi.fn().mockResolvedValue({
          state: 'HEALTHY',
          message: '',
          timestamp: '2021-01-01T00:00:00Z',
        }),
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../services/api_keys', () => {
      const mocked = {
      canCreateLogstashApiKey: vi.fn().mockResolvedValue(true),
      generateLogstashApiKey: vi.fn().mockResolvedValue({
        id: 'id',
        api_key: 'apikey',
      }),
    };
      return { ...mocked, default: mocked };
    });

const outputServiceMock = outputService as Mocked<typeof outputService>;

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  it('get outputs should return valid response', async () => {
    const expectedResponse = {
      items: [
        {
          id: 'output1',
          type: 'elasticsearch',
          hosts: ['http://elasticsearch:9200'],
          is_default: true,
          is_default_monitoring: true,
          name: 'Default',
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    };
    await getOutputsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetOutputsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get one output should return valid response', async () => {
    const output: Output = {
      id: 'output1',
      type: 'remote_elasticsearch',
      hosts: ['http://elasticsearch:9200'],
      is_default: true,
      is_default_monitoring: true,
      name: 'Default',
      secrets: {
        service_token: 'ref1',
      },
    };
    const expectedResponse = { item: output };
    outputServiceMock.get.mockResolvedValue(output);
    await getOneOutputHandler(context, { params: { outputId: 'output1' } } as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = OutputResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('put output should return valid response', async () => {
    const output: Output = {
      id: 'output1',
      type: 'logstash',
      hosts: ['logstash'],
      is_default: false,
      is_default_monitoring: false,
      name: 'Default',
      secrets: {
        ssl: { key: 'ref1' },
      },
      client_id: null, // extra field from previous kafka output
    } as any;
    const expectedResponse = { item: output };
    outputServiceMock.get.mockResolvedValue(output);
    await putOutputHandler(
      context,
      {
        params: { outputId: 'output1' },
        body: {
          name: 'Default',
        },
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = OutputResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('create output should return valid response', async () => {
    const output: Output = {
      id: 'output1',
      type: 'kafka',
      hosts: ['kafka:8000'],
      is_default: false,
      is_default_monitoring: false,
      name: 'Default',
      secrets: {
        ssl: { key: 'ref1' },
        password: 'password',
      },
      auth_type: 'ssl',
      sasl: {
        mechanism: 'PLAIN',
      },
      password: null,
      username: null,
    };
    const expectedResponse = { item: output };
    outputServiceMock.create.mockResolvedValue(output);
    await postOutputHandler(
      context,
      {
        params: { outputId: 'output1' },
        body: {
          name: 'Default',
        },
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = OutputResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('delete output should return valid response', async () => {
    const expectedResponse = {
      id: 'output1',
    };
    await deleteOutputHandler(context, { params: { outputId: 'output1' } } as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = DeleteOutputResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('post logstash api key should return valid response', async () => {
    const expectedResponse = {
      api_key: 'id:apikey',
    };
    await postLogstashApiKeyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GenerateLogstashApiKeyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get latest output health should return valid response', async () => {
    const expectedResponse = {
      state: 'HEALTHY',
      message: '',
      timestamp: '2021-01-01T00:00:00Z',
    };
    await getLatestOutputHealth(context, { params: { outputId: 'output1' } } as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetLatestOutputHealthResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
