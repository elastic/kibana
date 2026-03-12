/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceFeatureConfig } from './types';
import type { InferenceSettingsAttributes } from '../common/types';
import { InferenceFeatureRegistry } from './inference_feature_registry';
import { InferenceEndpoints } from './inference_endpoints';

const createValidFeature = (
  overrides: Partial<InferenceFeatureConfig> = {}
): InferenceFeatureConfig => ({
  featureId: 'test_feature',
  featureName: 'Test Feature',
  featureDescription: 'A test feature',
  taskType: 'text_embedding',
  recommendedEndpoints: [],
  ...overrides,
});

const createEndpointInfo = (id: string): InferenceInferenceEndpointInfo =>
  ({
    inference_id: id,
    task_type: 'text_embedding',
    service: 'elasticsearch',
  } as InferenceInferenceEndpointInfo);

const createSoRepo = (
  features: InferenceSettingsAttributes['features'] | 'not_found' = []
): ISavedObjectsRepository =>
  ({
    get: jest.fn().mockImplementation(() => {
      if (features === 'not_found') {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError('inference-settings', 'default');
      }
      return {
        id: 'default',
        type: 'inference-settings',
        attributes: { features },
      } as SavedObject<InferenceSettingsAttributes>;
    }),
  } as unknown as ISavedObjectsRepository);

const createEsClient = (
  endpointMap: Record<string, InferenceInferenceEndpointInfo | 'not_found'> = {}
): ElasticsearchClient =>
  ({
    inference: {
      get: jest.fn().mockImplementation(({ inference_id: id }: { inference_id: string }) => {
        const entry = endpointMap[id];
        if (entry === 'not_found') {
          const err = new Error('Not found') as any;
          err.statusCode = 404;
          throw err;
        }
        return Promise.resolve({ endpoints: entry ? [entry] : [] });
      }),
    },
  } as unknown as ElasticsearchClient);

describe('InferenceEndpoints', () => {
  let registry: InferenceFeatureRegistry;

  beforeEach(() => {
    registry = new InferenceFeatureRegistry();
  });

  const makeEndpoints = (
    soRepo: ISavedObjectsRepository,
    esClient: ElasticsearchClient
  ): InferenceEndpoints => new InferenceEndpoints(registry, soRepo, esClient);

  it('throws when featureId is not registered', async () => {
    const ep = makeEndpoints(createSoRepo(), createEsClient());
    await expect(ep.getForFeature('unknown')).rejects.toThrow('not registered');
  });

  it('returns empty array when no endpoints resolved', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    const ep = makeEndpoints(createSoRepo(), createEsClient());
    await expect(ep.getForFeature('f1')).resolves.toEqual([]);
  });

  it('returns hydrated endpoints from SO override', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    const info = createEndpointInfo('ep1');
    const ep = makeEndpoints(
      createSoRepo([{ feature_id: 'f1', endpoints: [{ id: 'ep1' }] }]),
      createEsClient({ ep1: info })
    );
    await expect(ep.getForFeature('f1')).resolves.toEqual([info]);
  });

  it('returns hydrated endpoints from recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const info = createEndpointInfo('rec1');
    const ep = makeEndpoints(createSoRepo(), createEsClient({ rec1: info }));
    await expect(ep.getForFeature('f1')).resolves.toEqual([info]);
  });

  it('walks the fallback chain to parent recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'parent', recommendedEndpoints: ['prec1'] }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    const info = createEndpointInfo('prec1');
    const ep = makeEndpoints(createSoRepo(), createEsClient({ prec1: info }));
    await expect(ep.getForFeature('child')).resolves.toEqual([info]);
  });

  it('walks the full chain: child -> parent -> grandparent', async () => {
    registry.register(
      createValidFeature({ featureId: 'grandparent', recommendedEndpoints: ['gp_ep'] })
    );
    registry.register(createValidFeature({ featureId: 'parent', parentFeatureId: 'grandparent' }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    const info = createEndpointInfo('gp_ep');
    const ep = makeEndpoints(createSoRepo(), createEsClient({ gp_ep: info }));
    await expect(ep.getForFeature('child')).resolves.toEqual([info]);
  });

  it('prefers SO override over recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const soInfo = createEndpointInfo('so_ep');
    const ep = makeEndpoints(
      createSoRepo([{ feature_id: 'f1', endpoints: [{ id: 'so_ep' }] }]),
      createEsClient({ so_ep: soInfo, rec1: createEndpointInfo('rec1') })
    );
    await expect(ep.getForFeature('f1')).resolves.toEqual([soInfo]);
  });

  it('skips SO entry with empty endpoints and falls through to recommended', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const info = createEndpointInfo('rec1');
    const ep = makeEndpoints(
      createSoRepo([{ feature_id: 'f1', endpoints: [] }]),
      createEsClient({ rec1: info })
    );
    await expect(ep.getForFeature('f1')).resolves.toEqual([info]);
  });

  it('handles SO 404 and falls through to recommended', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const info = createEndpointInfo('rec1');
    const ep = makeEndpoints(createSoRepo('not_found'), createEsClient({ rec1: info }));
    await expect(ep.getForFeature('f1')).resolves.toEqual([info]);
  });

  it('skips ES endpoints that no longer exist (404) without failing', async () => {
    registry.register(
      createValidFeature({ featureId: 'f1', recommendedEndpoints: ['ep1', 'ep2'] })
    );
    const info = createEndpointInfo('ep2');
    const ep = makeEndpoints(createSoRepo(), createEsClient({ ep1: 'not_found', ep2: info }));
    await expect(ep.getForFeature('f1')).resolves.toEqual([info]);
  });

  it('propagates non-404 ES errors', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['ep1'] }));
    const esClient = {
      inference: {
        get: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error('ES unavailable'), { statusCode: 503 })),
      },
    } as unknown as ElasticsearchClient;
    const ep = makeEndpoints(createSoRepo(), esClient);
    await expect(ep.getForFeature('f1')).rejects.toThrow('ES unavailable');
  });

  it('propagates non-404 SO errors', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    const soRepo = {
      get: jest.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as ISavedObjectsRepository;
    const ep = makeEndpoints(soRepo, createEsClient());
    await expect(ep.getForFeature('f1')).rejects.toThrow('Connection refused');
  });

  it('detects cycles and returns empty array', async () => {
    registry.register(createValidFeature({ featureId: 'a' }));
    registry.register(createValidFeature({ featureId: 'b', parentFeatureId: 'a' }));
    // Inject cycle
    (registry as any).features.get('a').parentFeatureId = 'b';
    const ep = makeEndpoints(createSoRepo(), createEsClient());
    await expect(ep.getForFeature('a')).resolves.toEqual([]);
  });
});
