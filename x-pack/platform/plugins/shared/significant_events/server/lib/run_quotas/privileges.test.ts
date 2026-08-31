/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SignificantEventsServer } from '../../types';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { assertCanManageTokenTrackingGlobally, canManageTokenTrackingGlobally } from './privileges';

describe('token tracking privileges', () => {
  const request = {} as KibanaRequest;

  it('requires Streams and Advanced Settings API privileges globally', async () => {
    const globally = jest.fn().mockResolvedValue({ hasAllRequested: true });
    const get = jest.fn((operation: string) => `api:${operation}`);
    const server = {
      security: {
        authz: {
          actions: { api: { get } },
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
        },
      },
    } as unknown as SignificantEventsServer;

    await expect(canManageTokenTrackingGlobally({ request, server })).resolves.toBe(true);
    expect(globally).toHaveBeenCalledWith({
      kibana: [`api:${STREAMS_API_PRIVILEGES.manage}`, 'api:manage_advanced_settings'],
    });
  });

  it('rejects deployment-wide tracking changes when either privilege is missing', async () => {
    const server = {
      security: {
        authz: {
          actions: { api: { get: (operation: string) => `api:${operation}` } },
          checkPrivilegesWithRequest: jest
            .fn()
            .mockReturnValue({ globally: jest.fn().mockResolvedValue({ hasAllRequested: false }) }),
        },
      },
    } as unknown as SignificantEventsServer;

    await expect(assertCanManageTokenTrackingGlobally({ request, server })).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
  });
});
