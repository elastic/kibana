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
});
