/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  type InferenceConnector,
  InferenceConnectorType,
  defaultInferenceEndpoints,
} from '@kbn/inference-common';
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

const createConnector = (id: string): InferenceConnector => ({
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
  isPreconfigured: false,
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

const createGetConnectorById = (
  connectorIds: string[]
): ((id: string) => Promise<InferenceConnector>) => {
  const connectorMap = new Map(connectorIds.map((id) => [id, createConnector(id)]));
  return jest.fn().mockImplementation((id: string) => {
    const connector = connectorMap.get(id);
    if (!connector) {
      throw new Error(`Connector ${id} not found`);
    }
    return Promise.resolve(connector);
  });
};

describe('getForFeature', () => {
  let registry: InferenceFeatureRegistry;
  let logger: Logger;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    registry = new InferenceFeatureRegistry(logger);
  });

  it('returns empty result and logs warning when featureId is not registered', async () => {
    const result = await getForFeature(
      registry,
      createSoClient(),
      createGetConnectorById([]),
      'unknown',
      logger
    );
    expect(result).toEqual({
      endpoints: [],
      warnings: [],
      soEntryFound: false,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not registered'));
  });

  it('falls back to Kibana default endpoint when no SO and no recommendations', async () => {
    const defaultEp = defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION;
    registry.register(createValidFeature({ featureId: 'f1', taskType: 'chat_completion' }));
    const result = await getForFeature(
      registry,
      createSoClient(),
      createGetConnectorById([defaultEp]),
      'f1',
      logger
    );
    expect(result).toEqual({
      endpoints: [createConnector(defaultEp)],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns empty result when SO explicitly lists empty endpoints', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [] }]),
        createGetConnectorById(['.anthropic-claude-4.5-sonnet-chat_completion']),
        'f1',
        logger
      )
    ).resolves.toEqual({ endpoints: [], warnings: [], soEntryFound: true });
  });

  it('returns hydrated endpoints from SO override', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [{ id: 'ep1' }] }]),
        createGetConnectorById(['ep1']),
        'f1',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('ep1')],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('returns hydrated endpoints from recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    await expect(
      getForFeature(registry, createSoClient(), createGetConnectorById(['rec1']), 'f1', logger)
    ).resolves.toEqual({
      endpoints: [createConnector('rec1')],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('walks the fallback chain to parent recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'parent', recommendedEndpoints: ['prec1'] }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    await expect(
      getForFeature(registry, createSoClient(), createGetConnectorById(['prec1']), 'child', logger)
    ).resolves.toEqual({
      endpoints: [createConnector('prec1')],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('walks the full chain: child -> parent -> grandparent', async () => {
    registry.register(
      createValidFeature({ featureId: 'grandparent', recommendedEndpoints: ['gp_ep'] })
    );
    registry.register(createValidFeature({ featureId: 'parent', parentFeatureId: 'grandparent' }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    await expect(
      getForFeature(registry, createSoClient(), createGetConnectorById(['gp_ep']), 'child', logger)
    ).resolves.toEqual({
      endpoints: [createConnector('gp_ep')],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('prefers SO override over recommendedEndpoints', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [{ id: 'so_ep' }] }]),
        createGetConnectorById(['so_ep', 'rec1']),
        'f1',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('so_ep')],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('returns empty when SO explicitly lists empty endpoints even if recommended exist', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [] }]),
        createGetConnectorById(['rec1']),
        'f1',
        logger
      )
    ).resolves.toEqual({ endpoints: [], warnings: [], soEntryFound: true });
  });

  it('handles SO 404 and falls through to recommended', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    await expect(
      getForFeature(
        registry,
        createSoClient('not_found'),
        createGetConnectorById(['rec1']),
        'f1',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('rec1')],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns warning for endpoints that are not found in connectors list', async () => {
    registry.register(
      createValidFeature({ featureId: 'f1', recommendedEndpoints: ['ep1', 'ep2'] })
    );
    const result = await getForFeature(
      registry,
      createSoClient(),
      createGetConnectorById(['ep2']),
      'f1',
      logger
    );
    expect(result.endpoints).toEqual([createConnector('ep2')]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('ep1');
  });

  it('falls back to recommended endpoints when SO client fails with non-404 error', async () => {
    registry.register(createValidFeature({ featureId: 'f1', recommendedEndpoints: ['rec1'] }));
    const soClient = {
      get: jest.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as ISavedObjectsRepository;
    const result = await getForFeature(
      registry,
      soClient,
      createGetConnectorById(['rec1']),
      'f1',
      logger
    );
    expect(result).toEqual({
      endpoints: [createConnector('rec1')],
      warnings: [],
      soEntryFound: false,
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Connection refused'));
  });

  it('detects cycles and returns empty endpoints with warning', async () => {
    registry.register(createValidFeature({ featureId: 'a', taskType: 'chat_completion' }));
    registry.register(
      createValidFeature({ featureId: 'b', parentFeatureId: 'a', taskType: 'chat_completion' })
    );
    (registry as any).features.get('a').parentFeatureId = 'b';
    const result = await getForFeature(
      registry,
      createSoClient(),
      createGetConnectorById(['.anthropic-claude-4.5-sonnet-chat_completion']),
      'a',
      logger
    );
    expect(result.endpoints).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Cyclic dependency');
    expect(result.soEntryFound).toBe(false);
  });

  it('detects cycles and returns empty endpoints for non-chat features', async () => {
    registry.register(createValidFeature({ featureId: 'a', taskType: 'text_embedding' }));
    registry.register(
      createValidFeature({ featureId: 'b', parentFeatureId: 'a', taskType: 'text_embedding' })
    );
    (registry as any).features.get('a').parentFeatureId = 'b';
    const result = await getForFeature(
      registry,
      createSoClient(),
      createGetConnectorById([]),
      'a',
      logger
    );
    expect(result.endpoints).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Cyclic dependency');
    expect(result.soEntryFound).toBe(false);
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
    await expect(
      getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['child_ep', 'parent_ep']),
        'child',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('child_ep')],
      warnings: [],
      soEntryFound: false,
    });
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
    await expect(
      getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['parent_ep', 'gp_ep']),
        'child',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('parent_ep')],
      warnings: [],
      soEntryFound: false,
    });
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
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'parent', endpoints: [{ id: 'so_ep' }] }]),
        createGetConnectorById(['so_ep', 'child_ep']),
        'child',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('so_ep')],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('uses grandparent recommendedEndpoints when parent has none', async () => {
    registry.register(
      createValidFeature({ featureId: 'grandparent', recommendedEndpoints: ['gp_ep'] })
    );
    registry.register(createValidFeature({ featureId: 'parent', parentFeatureId: 'grandparent' }));
    registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
    await expect(
      getForFeature(registry, createSoClient(), createGetConnectorById(['gp_ep']), 'child', logger)
    ).resolves.toEqual({
      endpoints: [createConnector('gp_ep')],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns different endpoint lists for different SO clients (simulating two spaces)', async () => {
    registry.register(createValidFeature({ featureId: 'f1' }));

    const soClientSpaceA = createSoClient([
      { feature_id: 'f1', endpoints: [{ id: 'ep-space-a' }] },
    ]);
    const soClientSpaceB = createSoClient([
      { feature_id: 'f1', endpoints: [{ id: 'ep-space-b' }] },
    ]);
    const getConnectorById = createGetConnectorById(['ep-space-a', 'ep-space-b']);

    const [resultA, resultB] = await Promise.all([
      getForFeature(registry, soClientSpaceA, getConnectorById, 'f1', logger),
      getForFeature(registry, soClientSpaceB, getConnectorById, 'f1', logger),
    ]);

    expect(resultA.soEntryFound).toBe(true);
    expect(resultB.soEntryFound).toBe(true);
    expect(resultA.endpoints[0].connectorId).toBe('ep-space-a');
    expect(resultB.endpoints[0].connectorId).toBe('ep-space-b');
    expect(resultA.endpoints[0].connectorId).not.toBe(resultB.endpoints[0].connectorId);
  });

  it('prefers recommendedEndpoints over Kibana default endpoint', async () => {
    registry.register(
      createValidFeature({
        featureId: 'f1',
        recommendedEndpoints: ['rec1'],
      })
    );
    await expect(
      getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['rec1', defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION]),
        'f1',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('rec1')],
      warnings: [],
      soEntryFound: false,
    });
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
    await expect(
      getForFeature(
        registry,
        createSoClient([{ feature_id: 'grandparent', endpoints: [{ id: 'gp_so' }] }]),
        createGetConnectorById(['gp_so', 'child_rec', 'parent_rec', 'gp_rec']),
        'child',
        logger
      )
    ).resolves.toEqual({
      endpoints: [createConnector('gp_so')],
      warnings: [],
      soEntryFound: true,
    });
  });

  describe('model parameters', () => {
    const lowEffort = { reasoning: { effort: 'low' as const } };

    it('returns declared parameters with recommended endpoints and omits them for plain ids', async () => {
      registry.register(
        createValidFeature({
          featureId: 'f1',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }, 'rec2'],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['rec1', 'rec2']),
        'f1',
        logger
      );
      expect(result.endpoints).toEqual([
        { ...createConnector('rec1'), parameters: lowEffort },
        createConnector('rec2'),
      ]);
      expect(result.endpoints[1]).not.toHaveProperty('parameters');
    });

    it('does not let callers change the registered parameters through a returned connector', async () => {
      registry.register(
        createValidFeature({
          featureId: 'f1',
          recommendedEndpoints: [{ id: 'rec1', parameters: { reasoning: { effort: 'low' } } }],
        })
      );
      const resolve = () =>
        getForFeature(registry, createSoClient(), createGetConnectorById(['rec1']), 'f1', logger);

      const {
        endpoints: [{ parameters }],
      } = await resolve();
      if (parameters?.reasoning) {
        parameters.reasoning.effort = 'none';
      }
      const second = await resolve();

      expect(second.endpoints[0].parameters).toEqual({ reasoning: { effort: 'low' } });
      expect(registry.get('f1')?.recommendedEndpoints[0].parameters).toEqual({
        reasoning: { effort: 'low' },
      });
    });

    it('inherits parent parameters when the child has no recommended endpoints', async () => {
      registry.register(
        createValidFeature({
          featureId: 'parent',
          recommendedEndpoints: [{ id: 'prec1', parameters: lowEffort }],
        })
      );
      registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['prec1']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([{ ...createConnector('prec1'), parameters: lowEffort }]);
    });

    it('returns SO override endpoints without the declared parameters', async () => {
      registry.register(
        createValidFeature({
          featureId: 'f1',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [{ id: 'rec1' }] }]),
        createGetConnectorById(['rec1']),
        'f1',
        logger
      );
      expect(result).toEqual({
        endpoints: [createConnector('rec1')],
        warnings: [],
        soEntryFound: true,
      });
      expect(result.endpoints[0]).not.toHaveProperty('parameters');
    });

    it('returns the stored SO override parameters instead of the declared parameters', async () => {
      const highEffort = { reasoning: { effort: 'high' as const } };
      registry.register(
        createValidFeature({
          featureId: 'f1',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [{ id: 'rec1', parameters: highEffort }] }]),
        createGetConnectorById(['rec1']),
        'f1',
        logger
      );
      expect(result).toEqual({
        endpoints: [{ ...createConnector('rec1'), parameters: highEffort }],
        warnings: [],
        soEntryFound: true,
      });
    });

    it('returns the stored parent SO override parameters for a child', async () => {
      const storedParameters = { reasoning: { effort: 'high' as const } };
      registry.register(createValidFeature({ featureId: 'parent' }));
      registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
      const result = await getForFeature(
        registry,
        createSoClient([
          { feature_id: 'parent', endpoints: [{ id: 'so_ep', parameters: storedParameters }] },
        ]),
        createGetConnectorById(['so_ep']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([
        { ...createConnector('so_ep'), parameters: storedParameters },
      ]);
    });

    it('returns a parent SO override resolved for a child without the declared parameters', async () => {
      registry.register(
        createValidFeature({
          featureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }],
        })
      );
      registry.register(createValidFeature({ featureId: 'child', parentFeatureId: 'parent' }));
      const result = await getForFeature(
        registry,
        createSoClient([{ feature_id: 'parent', endpoints: [{ id: 'rec1' }] }]),
        createGetConnectorById(['rec1']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([createConnector('rec1')]);
      expect(result.endpoints[0]).not.toHaveProperty('parameters');
    });

    it('drops parent parameters when the child recommends the same endpoint as a plain id', async () => {
      registry.register(
        createValidFeature({
          featureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: { reasoning: { effort: 'medium' } } }],
        })
      );
      registry.register(
        createValidFeature({
          featureId: 'child',
          parentFeatureId: 'parent',
          recommendedEndpoints: ['rec1', 'child_rec'],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['rec1', 'child_rec']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([createConnector('rec1'), createConnector('child_rec')]);
      expect(result.endpoints[0]).not.toHaveProperty('parameters');
    });

    it('drops parent parameters for an SO override endpoint the child lists as a plain id', async () => {
      registry.register(
        createValidFeature({
          featureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }],
        })
      );
      registry.register(
        createValidFeature({
          featureId: 'child',
          parentFeatureId: 'parent',
          recommendedEndpoints: ['rec1'],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient([{ feature_id: 'parent', endpoints: [{ id: 'rec1' }] }]),
        createGetConnectorById(['rec1']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([createConnector('rec1')]);
    });

    it('lets a child opt out of parent parameters with an empty parameters object', async () => {
      registry.register(
        createValidFeature({
          featureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }],
        })
      );
      registry.register(
        createValidFeature({
          featureId: 'child',
          parentFeatureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: {} }],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['rec1']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([{ ...createConnector('rec1'), parameters: {} }]);
    });

    it('prefers child parameters over parent parameters for the same endpoint', async () => {
      const highEffort = { reasoning: { effort: 'high' as const } };
      registry.register(
        createValidFeature({
          featureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }],
        })
      );
      registry.register(
        createValidFeature({
          featureId: 'child',
          parentFeatureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: highEffort }],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['rec1']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([{ ...createConnector('rec1'), parameters: highEffort }]);
    });

    it('uses child parameters when the child declares the same parameters as the parent', async () => {
      registry.register(
        createValidFeature({
          featureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: lowEffort }],
        })
      );
      registry.register(
        createValidFeature({
          featureId: 'child',
          parentFeatureId: 'parent',
          recommendedEndpoints: [{ id: 'rec1', parameters: { ...lowEffort } }],
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['rec1']),
        'child',
        logger
      );
      expect(result.endpoints).toEqual([{ ...createConnector('rec1'), parameters: lowEffort }]);
    });

    it('returns the Kibana default endpoint without parameters', async () => {
      registry.register(createValidFeature({ featureId: 'f1', taskType: 'chat_completion' }));
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById([defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION]),
        'f1',
        logger
      );
      expect(result.endpoints[0]).not.toHaveProperty('parameters');
    });

    it('returns SO override endpoints without parameters when the declared chain is cyclic', async () => {
      registry.register(createValidFeature({ featureId: 'a' }));
      registry.register(createValidFeature({ featureId: 'b', parentFeatureId: 'a' }));
      (registry as any).features.get('a').parentFeatureId = 'b';
      const result = await getForFeature(
        registry,
        createSoClient([{ feature_id: 'a', endpoints: [{ id: 'so_ep' }] }]),
        createGetConnectorById(['so_ep']),
        'a',
        logger
      );
      expect(result.endpoints).toEqual([createConnector('so_ep')]);
    });
  });

  describe('onlyReturnConfigured option', () => {
    it('returns empty list instead of KIBANA_DEFAULT when no SO or recommended endpoints exist', async () => {
      registry.register(createValidFeature({ featureId: 'f1', taskType: 'chat_completion' }));
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById([]),
        'f1',
        logger,
        { onlyReturnConfigured: true }
      );
      expect(result).toEqual({ endpoints: [], warnings: [], soEntryFound: false });
    });

    it('returns recommendedEndpoints when present and onlyReturnConfigured is true', async () => {
      registry.register(
        createValidFeature({
          featureId: 'f1',
          recommendedEndpoints: ['rec1'],
          taskType: 'chat_completion',
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['rec1']),
        'f1',
        logger,
        { onlyReturnConfigured: true }
      );
      expect(result).toEqual({
        endpoints: [createConnector('rec1')],
        warnings: [],
        soEntryFound: false,
      });
    });

    it('returns SO override when present and onlyReturnConfigured is true', async () => {
      registry.register(createValidFeature({ featureId: 'f1', taskType: 'chat_completion' }));
      const result = await getForFeature(
        registry,
        createSoClient([{ feature_id: 'f1', endpoints: [{ id: 'so_ep' }] }]),
        createGetConnectorById(['so_ep']),
        'f1',
        logger,
        { onlyReturnConfigured: true }
      );
      expect(result).toEqual({
        endpoints: [createConnector('so_ep')],
        warnings: [],
        soEntryFound: true,
      });
    });

    it('excludes unavailable connector from recommendedEndpoints and emits a warning', async () => {
      registry.register(
        createValidFeature({
          featureId: 'f1',
          recommendedEndpoints: ['available', 'missing'],
          taskType: 'chat_completion',
        })
      );
      const result = await getForFeature(
        registry,
        createSoClient(),
        createGetConnectorById(['available']),
        'f1',
        logger,
        { onlyReturnConfigured: true }
      );
      expect(result.endpoints).toEqual([createConnector('available')]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('missing');
      expect(result.soEntryFound).toBe(false);
    });
  });
});
