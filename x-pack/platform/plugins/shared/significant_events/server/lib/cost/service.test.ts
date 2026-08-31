/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SignificantEventsServer } from '../../types';
import { SignificantEventsCostService, type SignificantEventsCostResponse } from './service';

const response = (asOf: string): SignificantEventsCostResponse =>
  ({ asOf } as SignificantEventsCostResponse);

describe('SignificantEventsCostService', () => {
  const logger = loggingSystemMock.createLogger();
  const request = {} as KibanaRequest;
  const server = {} as SignificantEventsServer;

  it('caches month-scale work for sixty seconds and keys current-space gating separately', async () => {
    let now = Date.parse('2026-08-31T12:00:00.000Z');
    const load = jest
      .fn()
      .mockResolvedValueOnce(response('first'))
      .mockResolvedValueOnce(response('second'))
      .mockResolvedValueOnce(response('third'));
    const service = new SignificantEventsCostService({
      logger,
      now: () => now,
      load,
    });

    await expect(service.getCost({ request, server, currentSpaceId: 'default' })).resolves.toEqual(
      response('first')
    );
    now += 59_999;
    await expect(service.getCost({ request, server, currentSpaceId: 'default' })).resolves.toEqual(
      response('first')
    );
    await expect(service.getCost({ request, server, currentSpaceId: 'space-a' })).resolves.toEqual(
      response('second')
    );
    now += 2;
    await expect(service.getCost({ request, server, currentSpaceId: 'default' })).resolves.toEqual(
      response('third')
    );

    expect(load).toHaveBeenCalledTimes(3);
  });

  it('coalesces simultaneous loads and invalidates after tracking changes', async () => {
    let resolveLoad: ((value: SignificantEventsCostResponse) => void) | undefined;
    const load = jest.fn(
      () =>
        new Promise<SignificantEventsCostResponse>((resolve) => {
          resolveLoad = resolve;
        })
    );
    const service = new SignificantEventsCostService({ logger, load });

    const first = service.getCost({ request, server, currentSpaceId: 'default' });
    const second = service.getCost({ request, server, currentSpaceId: 'default' });
    expect(load).toHaveBeenCalledTimes(1);
    resolveLoad?.(response('loaded'));
    await expect(Promise.all([first, second])).resolves.toEqual([
      response('loaded'),
      response('loaded'),
    ]);

    service.invalidate();
    void service.getCost({ request, server, currentSpaceId: 'default' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not restore stale coverage when an invalidated load finishes late', async () => {
    const resolvers: Array<(value: SignificantEventsCostResponse) => void> = [];
    const load = jest.fn(
      () =>
        new Promise<SignificantEventsCostResponse>((resolve) => {
          resolvers.push(resolve);
        })
    );
    const service = new SignificantEventsCostService({ logger, load });

    const stale = service.getCost({ request, server, currentSpaceId: 'default' });
    service.invalidate();
    const fresh = service.getCost({ request, server, currentSpaceId: 'default' });
    expect(load).toHaveBeenCalledTimes(2);

    resolvers[0](response('stale'));
    await expect(stale).resolves.toEqual(response('stale'));
    resolvers[1](response('fresh'));
    await expect(fresh).resolves.toEqual(response('fresh'));

    await expect(service.getCost({ request, server, currentSpaceId: 'default' })).resolves.toEqual(
      response('fresh')
    );
    expect(load).toHaveBeenCalledTimes(2);
  });
});
