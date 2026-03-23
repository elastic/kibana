/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { type InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InferenceFeatureConfig } from './types';
import type { InferenceSettingsAttributes } from '../common/types';
import { InferenceFeatureRegistry } from './inference_feature_registry';
import { getForFeature } from './inference_endpoints';

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

const createExpectedConnector = (id: string): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: id,
  connectorId: id,
  config: {
    inferenceId: id,
    providerConfig: {
      model_id: undefined,
    },
    taskType: 'text_embedding',
    service: 'elasticsearch',
    serviceSettings: undefined,
  },
  capabilities: {},
  isInferenceEndpoint: true,
});

const createSoClient = (
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

describe('getForFeature', () => {
  let registry: InferenceFeatureRegistry;

  beforeEach(() => {
    registry = new InferenceFeatureRegistry(loggingSystemMock.createLogger());
  });

  it('throws when featureId is not registered', async () => {
    await expect(
      getForFeature(registry, createSoClient(), createEsClient(), 'unknown')
    ).rejects.toThrow('not registered');
  });

  it('returns empty result when no endpoints resolved', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    await expect(
      getForFeature(registry, createSoClient(), createEsClient(), 'f1')
    ).resolves.toEqual({ endpoints: [], warnings: [] });
  });

  it('returns hydrated endpoints from SO override', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    const info = createEndpointInfo('ep1');
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [{ id: 'ep1' }] }]),
        createEsClient({ ep1: info }),
        'f1'
      )
    ).resolves.toEqual({ endpoints: [createExpectedConnector('ep1')], warnings: [] });
  });

  it('returns hydrated endpoints from recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const info = createEndpointInfo('rec1');
    await expect(
      getForFeature(registry, createSoClient(), createEsClient({ rec1: info }), 'f1')
    ).resolves.toEqual({ endpoints: [createExpectedConnector('rec1')], warnings: [] });
  });

  it('walks the fallback chain to parent recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'parent', recommendedEndpoints: ['prec1'] }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    const info = createEndpointInfo('prec1');
    await expect(
      getForFeature(registry, createSoClient(), createEsClient({ prec1: info }), 'child')
    ).resolves.toEqual({ endpoints: [createExpectedConnector('prec1')], warnings: [] });
  });

  it('walks the full chain: child -> parent -> grandparent', async () => {
    registry.register(
      createValidFeature({ featureId: 'grandparent', recommendedEndpoints: ['gp_ep'] })
    );
    registry.register(createValidFeature({ featureId: 'parent', parentFeatureId: 'grandparent' }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    const info = createEndpointInfo('gp_ep');
    await expect(
      getForFeature(registry, createSoClient(), createEsClient({ gp_ep: info }), 'child')
    ).resolves.toEqual({ endpoints: [createExpectedConnector('gp_ep')], warnings: [] });
  });

  it('prefers SO override over recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const soInfo = createEndpointInfo('so_ep');
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [{ id: 'so_ep' }] }]),
        createEsClient({ so_ep: soInfo, rec1: createEndpointInfo('rec1') }),
        'f1'
      )
    ).resolves.toEqual({ endpoints: [createExpectedConnector('so_ep')], warnings: [] });
  });

  it('skips SO entry with empty endpoints and falls through to recommended', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const info = createEndpointInfo('rec1');
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [] }]),
        createEsClient({ rec1: info }),
        'f1'
      )
    ).resolves.toEqual({ endpoints: [createExpectedConnector('rec1')], warnings: [] });
  });

  it('handles SO 404 and falls through to recommended', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const info = createEndpointInfo('rec1');
    await expect(
      getForFeature(registry, createSoClient('not_found'), createEsClient({ rec1: info }), 'f1')
    ).resolves.toEqual({ endpoints: [createExpectedConnector('rec1')], warnings: [] });
  });

  it('returns warning for ES endpoints that no longer exist (404)', async () => {
    registry.register(
      createValidFeature({ featureId: 'f1', recommendedEndpoints: ['ep1', 'ep2'] })
    );
    const info = createEndpointInfo('ep2');
    const result = await getForFeature(
      registry,
      createSoClient(),
      createEsClient({ ep1: 'not_found', ep2: info }),
      'f1'
    );
    expect(result.endpoints).toEqual([createExpectedConnector('ep2')]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('ep1');
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
    await expect(getForFeature(registry, createSoClient(), esClient, 'f1')).rejects.toThrow(
      'ES unavailable'
    );
  });

  it('propagates non-404 SO errors', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    const soClient = {
      get: jest.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as ISavedObjectsRepository;
    await expect(getForFeature(registry, soClient, createEsClient(), 'f1')).rejects.toThrow(
      'Connection refused'
    );
  });

  it('detects cycles and returns empty result with warning', async () => {
    registry.register(createValidFeature({ featureId: 'a' }));
    registry.register(createValidFeature({ featureId: 'b', parentFeatureId: 'a' }));
    (registry as any).features.get('a').parentFeatureId = 'b';
    const result = await getForFeature(registry, createSoClient(), createEsClient(), 'a');
    expect(result.endpoints).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Cyclic dependency');
  });

  it('prefers child recommendedEndpoints over parent recommendedEndpoints', async () => {
    registry.register(
      createValidFeature({ featureId: 'parent', recommendedEndpoints: ['parent_ep'] })
    );
    registry.register(
      createValidFeature({
        featureId: 'child',
        parentFeatureId: 'parent',
        recommendedEndpoints: ['child_ep'],
      })
    );
    const info = createEndpointInfo('child_ep');
    await expect(
      getForFeature(
        registry,
        createSoClient(),
        createEsClient({ child_ep: info, parent_ep: createEndpointInfo('parent_ep') }),
        'child'
      )
    ).resolves.toEqual({ endpoints: [createExpectedConnector('child_ep')], warnings: [] });
  });

  it('uses first recommendedEndpoints found in chain when child has none', async () => {
    registry.register(
      createValidFeature({ featureId: 'grandparent', recommendedEndpoints: ['gp_ep'] })
    );
    registry.register(
      createValidFeature({
        featureId: 'parent',
        parentFeatureId: 'grandparent',
        recommendedEndpoints: ['parent_ep'],
      })
    );
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    const info = createEndpointInfo('parent_ep');
    await expect(
      getForFeature(
        registry,
        createSoClient(),
        createEsClient({ parent_ep: info, gp_ep: createEndpointInfo('gp_ep') }),
        'child'
      )
    ).resolves.toEqual({ endpoints: [createExpectedConnector('parent_ep')], warnings: [] });
  });

  it('prefers parent SO override over child recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'parent' }));
    registry.register(
      createValidFeature({
        featureId: 'child',
        parentFeatureId: 'parent',
        recommendedEndpoints: ['child_ep'],
      })
    );
    const soInfo = createEndpointInfo('so_ep');
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'parent', endpoints: [{ id: 'so_ep' }] }]),
        createEsClient({ so_ep: soInfo, child_ep: createEndpointInfo('child_ep') }),
        'child'
      )
    ).resolves.toEqual({ endpoints: [createExpectedConnector('so_ep')], warnings: [] });
  });

  it('uses grandparent recommendedEndpoints when parent has none', async () => {
    registry.register(
      createValidFeature({ featureId: 'grandparent', recommendedEndpoints: ['gp_ep'] })
    );
    registry.register(createValidFeature({ featureId: 'parent', parentFeatureId: 'grandparent' }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    const info = createEndpointInfo('gp_ep');
    await expect(
      getForFeature(registry, createSoClient(), createEsClient({ gp_ep: info }), 'child')
    ).resolves.toEqual({ endpoints: [createExpectedConnector('gp_ep')], warnings: [] });
  });

  it('prefers grandparent SO override over all recommendedEndpoints', async () => {
    registry.register(
      createValidFeature({ featureId: 'grandparent', recommendedEndpoints: ['gp_rec'] })
    );
    registry.register(
      createValidFeature({
        featureId: 'parent',
        parentFeatureId: 'grandparent',
        recommendedEndpoints: ['parent_rec'],
      })
    );
    registry.register(
      createValidFeature({
        featureId: 'child',
        parentFeatureId: 'parent',
        recommendedEndpoints: ['child_rec'],
      })
    );
    const soInfo = createEndpointInfo('gp_so');
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'grandparent', endpoints: [{ id: 'gp_so' }] }]),
        createEsClient({
          gp_so: soInfo,
          child_rec: createEndpointInfo('child_rec'),
          parent_rec: createEndpointInfo('parent_rec'),
          gp_rec: createEndpointInfo('gp_rec'),
        }),
        'child'
      )
    ).resolves.toEqual({ endpoints: [createExpectedConnector('gp_so')], warnings: [] });
  });
});
