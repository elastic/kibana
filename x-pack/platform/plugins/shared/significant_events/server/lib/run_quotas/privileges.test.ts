/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import type { SignificantEventsServer } from '../../types';
import { assertCanManageRunQuotas, canManageRunQuotas } from './privileges';

const request = {} as KibanaRequest;

const createServer = (hasAllRequested: boolean) => {
  const globally = jest.fn().mockResolvedValue({ hasAllRequested });
  const get = jest.fn().mockReturnValue('streams-manage-action');
  const server = {
    security: {
      authz: {
        actions: { api: { get } },
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({ globally }),
      },
    },
  } as unknown as SignificantEventsServer;

  return { server, get, globally };
};

describe('run quota global management privilege', () => {
  it('checks Streams manage globally', async () => {
    const { server, get, globally } = createServer(true);

    await expect(canManageRunQuotas({ request, server })).resolves.toBe(true);
    expect(get).toHaveBeenCalledWith(STREAMS_API_PRIVILEGES.manage);
    expect(globally).toHaveBeenCalledWith({
      kibana: ['streams-manage-action'],
    });
  });

  it('denies settings management without Streams manage in every space', async () => {
    const { server } = createServer(false);

    await expect(assertCanManageRunQuotas({ request, server })).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
  });
});
