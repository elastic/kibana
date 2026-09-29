/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { httpServerMock } from '@kbn/core-http-server-mocks';

import { xpackMocks } from '../../mocks';
import type { FleetRequestHandlerContext } from '../..';
import { SettingsResponseSchema, SpaceSettingsResponseSchema } from '../../types';

import { getSettingsHandler, getSpaceSettingsHandler } from './settings_handler';

vi.mock('../../services/spaces/space_settings', () => {
  const mocked = {
    getSpaceSettings: vi.fn().mockResolvedValue({
      allowed_namespace_prefixes: [],
      managed_by: 'kibana',
    }),
    saveSpaceSettings: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../services', () => {
  const mocked = {
    settingsService: {
      getSettings: vi.fn().mockResolvedValue({
        id: '1',
        version: '1',
        preconfigured_fields: ['fleet_server_hosts'],
        secret_storage_requirements_met: true,
        output_secret_storage_requirements_met: true,
        has_seen_add_data_notice: true,
        prerelease_integrations_enabled: true,
        delete_unenrolled_agents: {
          enabled: true,
          is_preconfigured: false,
        },
      }),
    },
    appContextService: {
      getLogger: vi.fn().mockReturnValue({ error: vi.fn() }),
      getInternalUserSOClientWithoutSpaceExtension: vi.fn(),
    },
    agentPolicyService: {
      get: vi.fn(),
      getByIds: vi.fn(),
    },
  };
  return { ...mocked, default: mocked };
});

describe('SettingsHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  it('should return valid space settings', async () => {
    await getSpaceSettingsHandler(context, {} as any, response);
    const expectedResponse = {
      item: {
        allowed_namespace_prefixes: [],
        managed_by: 'kibana',
      },
    };
    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = SpaceSettingsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('should return valid settings', async () => {
    await getSettingsHandler(context, {} as any, response);
    const expectedResponse = {
      item: {
        id: '1',
        version: '1',
        preconfigured_fields: ['fleet_server_hosts'],
        secret_storage_requirements_met: true,
        output_secret_storage_requirements_met: true,
        has_seen_add_data_notice: true,
        prerelease_integrations_enabled: true,
        delete_unenrolled_agents: {
          enabled: true,
          is_preconfigured: false,
        },
      },
    };
    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = SettingsResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
