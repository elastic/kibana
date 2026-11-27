/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { STATUS_API_PATH, type BootstrapStatusAttributes } from '../../common';
import type { InternalServices } from '../types';
import { registerStatusRoute } from './status';

describe('status route', () => {
  const get = jest.fn();

  const setup = () => {
    const router = httpServiceMock.createRouter();
    registerStatusRoute({
      router,
      getServices: () => ({ status: { get } } as unknown as InternalServices),
    });
    const [config, handler] = router.get.mock.calls[0];
    return { config, handler };
  };

  const call = async () => {
    const { handler } = setup();
    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);
    return response;
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('is an internal route that only a superuser may call', () => {
    const { config } = setup();

    expect(config.path).toBe(STATUS_API_PATH);
    expect(config.options).toEqual({ access: 'internal' });
    expect(config.security).toEqual({
      authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
    });
  });

  it('returns the latest recorded run', async () => {
    const latest: BootstrapStatusAttributes = {
      hash: 'h1',
      status: 'completed',
      kinds: { data_view: { applied: 1, failed: 0 } },
      errors: [],
    };
    get.mockResolvedValueOnce(latest);

    const response = await call();

    expect(response.ok).toHaveBeenCalledWith({ body: latest });
  });

  it('leaves out the request numbers and settings hash, which only decide runs inside Kibana', async () => {
    const latest: BootstrapStatusAttributes = {
      hash: 'h1',
      status: 'completed',
      kinds: {},
      errors: [],
      coveredRequestNumber: 3,
      settingsHash: 's1',
      finishedRequestNumber: 3,
    };
    get.mockResolvedValueOnce(latest);

    const response = await call();

    expect(response.ok).toHaveBeenCalledWith({
      body: { hash: 'h1', status: 'completed', kinds: {}, errors: [] },
    });
  });

  it('says there was no run yet instead of an error', async () => {
    get.mockResolvedValueOnce(undefined);

    const response = await call();

    expect(response.ok).toHaveBeenCalledWith({
      body: { status: 'none', hash: null, kinds: {}, errors: [] },
    });
  });
});
