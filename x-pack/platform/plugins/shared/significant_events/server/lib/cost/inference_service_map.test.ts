/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { fetchInferenceServiceMap, InferenceServiceMapService } from './inference_service_map';

describe('fetchInferenceServiceMap', () => {
  it('maps endpoint service and model while pricing only Elastic Inference Service', async () => {
    const get = jest.fn().mockResolvedValue({
      endpoints: [
        {
          inference_id: '.rainbow-sprinkles-elastic',
          service: 'elastic',
          service_settings: { model_id: 'openai-gpt-5.4' },
        },
        {
          inference_id: '.elser-2',
          service: 'elasticsearch',
          service_settings: { model_id: 'elser-v2' },
        },
        {
          inference_id: 'bring-your-own',
          service: 'openai',
          service_settings: { model_id: 'gpt-5' },
        },
        {
          inference_id: 'missing-model',
          service: 'elastic',
          service_settings: {},
        },
      ],
    });

    const result = await fetchInferenceServiceMap({
      inference: { get },
    } as unknown as ElasticsearchClient);

    expect(get).toHaveBeenCalledWith({ inference_id: '_all' });
    expect(result.get('.rainbow-sprinkles-elastic')).toEqual({
      service: 'elastic',
      model: 'openai-gpt-5.4',
      priceable: true,
    });
    expect(result.get('.elser-2')).toEqual({
      service: 'elasticsearch',
      model: 'elser-v2',
      priceable: false,
    });
    expect(result.get('bring-your-own')).toEqual({
      service: 'openai',
      model: 'gpt-5',
      priceable: false,
    });
    expect(result.get('missing-model')).toEqual({
      service: 'elastic',
      model: undefined,
      priceable: false,
    });
    expect(result.has('deleted-endpoint')).toBe(false);
  });

  it('rejects duplicate endpoint ids rather than selecting one service', async () => {
    const get = jest.fn().mockResolvedValue({
      endpoints: [
        {
          inference_id: 'duplicate',
          service: 'elastic',
          service_settings: { model_id: 'openai-gpt-5.4' },
        },
        {
          inference_id: 'duplicate',
          service: 'openai',
          service_settings: { model_id: 'gpt-5' },
        },
      ],
    });

    await expect(
      fetchInferenceServiceMap({
        inference: { get },
      } as unknown as ElasticsearchClient)
    ).rejects.toThrow('Duplicate inference endpoint id');
  });
});

describe('InferenceServiceMapService', () => {
  it('caches endpoint resolution and falls back explicitly to stale data', async () => {
    let now = Date.parse('2026-08-31T12:00:00.000Z');
    const get = jest
      .fn()
      .mockResolvedValueOnce({
        endpoints: [
          {
            inference_id: 'elastic-endpoint',
            service: 'elastic',
            service_settings: { model_id: 'openai-gpt-5.4' },
          },
        ],
      })
      .mockRejectedValueOnce(new Error('offline'));
    const client = {
      inference: { get },
    } as unknown as ElasticsearchClient;
    const logger = loggingSystemMock.createLogger();
    const service = new InferenceServiceMapService(logger, () => now, 100);

    const fresh = await service.getServiceMap(client);
    now += 99;
    await expect(service.getServiceMap(client)).resolves.toEqual(fresh);
    now += 2;
    const stale = await service.getServiceMap(client);

    expect(get).toHaveBeenCalledTimes(2);
    expect(stale.stale).toBe(true);
    expect(stale.serviceMap).toBe(fresh.serviceMap);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
  });
});
