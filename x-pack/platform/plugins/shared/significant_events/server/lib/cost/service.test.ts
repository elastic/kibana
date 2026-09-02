/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SignificantEventsServer } from '../../types';
import type { InferenceServiceMapResult } from './inference_service_map';
import type { PriceServiceResult } from './price_service';
import {
  loadCostReferenceData,
  SignificantEventsCostService,
  type SignificantEventsCostResponse,
} from './service';

const response = (asOf: string): SignificantEventsCostResponse =>
  ({ asOf } as SignificantEventsCostResponse);

const priceResult = {
  catalog: {
    pricesByModel: new Map(),
    effectiveAt: '2026-08-31T12:00:00.000Z',
    currency: { code: 'USD', symbol: '$', assumed: true, unit: '1M Token' },
  },
  fetchedAt: '2026-08-31T12:00:00.000Z',
  stale: false,
} satisfies PriceServiceResult;

const serviceMapResult = (priceable: boolean): InferenceServiceMapResult => ({
  serviceMap: new Map([
    [
      'endpoint',
      {
        service: priceable ? 'elastic' : 'openai',
        model: 'openai-gpt-5.4',
        priceable,
      },
    ],
  ]),
  fetchedAt: '2026-08-31T12:00:00.000Z',
  stale: false,
});

describe('loadCostReferenceData', () => {
  const logger = loggingSystemMock.createLogger();
  const now = new Date('2026-08-31T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch Cloud prices when no endpoint is priceable', async () => {
    const getPrices = jest.fn().mockResolvedValue(priceResult);

    const result = await loadCostReferenceData({
      getPrices,
      getServiceMap: jest.fn().mockResolvedValue(serviceMapResult(false)),
      getAudit: jest.fn().mockResolvedValue(undefined),
      now,
      logger,
    });

    expect(getPrices).not.toHaveBeenCalled();
    expect(result.priceUnavailable).toBe(false);
    expect(result.priceResult.fetchedAt).toBe('');
  });

  it('degrades when the endpoint map and audit are unavailable without fetching prices', async () => {
    const getPrices = jest.fn().mockResolvedValue(priceResult);

    const result = await loadCostReferenceData({
      getPrices,
      getServiceMap: jest.fn().mockRejectedValue(new Error('map unavailable')),
      getAudit: jest.fn().mockRejectedValue(new Error('audit unavailable')),
      now,
      logger,
    });

    expect(getPrices).not.toHaveBeenCalled();
    expect(result.serviceMapUnavailable).toBe(true);
    expect(result.auditUnavailable).toBe(true);
    expect(result.audit).toBeUndefined();
  });

  it('degrades a cold price failure after finding a priceable endpoint', async () => {
    const result = await loadCostReferenceData({
      getPrices: jest.fn().mockRejectedValue(new Error('price unavailable')),
      getServiceMap: jest.fn().mockResolvedValue(serviceMapResult(true)),
      getAudit: jest.fn().mockResolvedValue(undefined),
      now,
      logger,
    });

    expect(result.priceUnavailable).toBe(true);
    expect(result.priceResult.catalog.pricesByModel.size).toBe(0);
  });
});

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
