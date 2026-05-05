/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceEndpointWithMetadata } from '../types';
import { mockEISPreconfiguredEndpoints } from '../__mocks__/inference_endpoints';
import {
  filterPreconfiguredEndpoints,
  findEndpointsWithoutConnectors,
  findStaleDynamicConnectorIds,
  connectorFromEndpoint,
  getConnectorIdFromEndpoint,
  getConnectorNameFromEndpoint,
} from './in_memory_connectors';

const makeEndpoint = (
  overrides: Partial<InferenceEndpointWithMetadata> = {}
): InferenceEndpointWithMetadata => ({
  inference_id: '.test-model-chat_completion',
  task_type: 'chat_completion',
  service: 'elastic',
  service_settings: { model_id: 'test-model' },
  metadata: {
    heuristics: {
      properties: ['kibana-connector'],
    },
  },
  ...overrides,
});

describe('filterPreconfiguredEndpoints', () => {
  it('returns endpoints that have kibana-connector in metadata.heuristics.properties and are chat_completion', () => {
    const endpoint = makeEndpoint();
    expect(filterPreconfiguredEndpoints([endpoint])).toEqual([endpoint]);
  });

  it('filters out endpoints without metadata', () => {
    const endpoint: InferenceInferenceEndpointInfo = {
      inference_id: '.test-model-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'test-model' },
    };
    expect(filterPreconfiguredEndpoints([endpoint])).toEqual([]);
  });

  it('filters out endpoints where kibana-connector is not in metadata.heuristics.properties', () => {
    const endpoint = makeEndpoint({
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
        },
      },
    });
    expect(filterPreconfiguredEndpoints([endpoint])).toEqual([]);
  });

  it('filters out endpoints where task_type is not chat_completion', () => {
    expect(
      filterPreconfiguredEndpoints([
        makeEndpoint({ task_type: 'completion' }),
        makeEndpoint({ task_type: 'text_embedding' }),
        makeEndpoint({ task_type: 'sparse_embedding' }),
      ])
    ).toEqual([]);
  });

  it('returns only matching endpoints from a mixed list', () => {
    const valid = makeEndpoint();
    const results = filterPreconfiguredEndpoints([
      valid,
      makeEndpoint({ metadata: { heuristics: { properties: ['multilingual'] } } }),
      makeEndpoint({ task_type: 'sparse_embedding' }),
      {
        inference_id: 'no-metadata-chat_completion',
        task_type: 'chat_completion',
        service: 'elastic',
        service_settings: {},
      },
    ]);
    expect(results).toEqual([valid]);
  });

  it('returns an empty array for an empty input', () => {
    expect(filterPreconfiguredEndpoints([])).toEqual([]);
  });

  it('filters the EIS mock endpoints to only chat_completion endpoints with kibana-connector property', () => {
    const results = filterPreconfiguredEndpoints(mockEISPreconfiguredEndpoints);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((endpoint) => {
      const ep = endpoint as InferenceEndpointWithMetadata;
      expect(ep.metadata?.heuristics?.properties).toContain('kibana-connector');
      expect(endpoint.task_type).toBe('chat_completion');
    });
  });
});

describe('findEndpointsWithoutConnectors', () => {
  const endpointA = makeEndpoint({ inference_id: '.model-a-chat_completion' });
  const endpointB = makeEndpoint({ inference_id: '.model-b-chat_completion' });
  const connectorA = connectorFromEndpoint(endpointA);

  it('returns all endpoints when there are no existing connectors', () => {
    expect(findEndpointsWithoutConnectors([endpointA, endpointB], [])).toEqual([
      endpointA,
      endpointB,
    ]);
  });

  it('excludes endpoints that already have a matching connector', () => {
    expect(findEndpointsWithoutConnectors([endpointA, endpointB], [connectorA])).toEqual([
      endpointB,
    ]);
  });

  it('ignores connectors without an inferenceId in config', () => {
    const connectorWithoutInferenceId = { ...connectorA, config: {} };
    const result = findEndpointsWithoutConnectors([endpointA], [connectorWithoutInferenceId]);
    expect(result).toEqual([endpointA]);
  });

  it('returns an empty array when all endpoints have matching connectors', () => {
    const connectorB = connectorFromEndpoint(endpointB);
    expect(
      findEndpointsWithoutConnectors([endpointA, endpointB], [connectorA, connectorB])
    ).toEqual([]);
  });
});

describe('findStaleDynamicConnectorIds', () => {
  const endpointA = makeEndpoint({ inference_id: '.model-a-chat_completion' });
  const endpointB = makeEndpoint({ inference_id: '.model-b-chat_completion' });
  const dynamicConnectorA = { ...connectorFromEndpoint(endpointA), isDynamic: true };
  const dynamicConnectorB = { ...connectorFromEndpoint(endpointB), isDynamic: true };

  it('returns connector ids that no longer have a matching endpoint', () => {
    expect(
      findStaleDynamicConnectorIds([endpointA], [dynamicConnectorA, dynamicConnectorB])
    ).toEqual([dynamicConnectorB.id]);
  });

  it('returns an empty array when all dynamic connectors still have matching endpoints', () => {
    expect(
      findStaleDynamicConnectorIds([endpointA, endpointB], [dynamicConnectorA, dynamicConnectorB])
    ).toEqual([]);
  });

  it('returns all dynamic connector ids when no endpoints remain', () => {
    expect(findStaleDynamicConnectorIds([], [dynamicConnectorA, dynamicConnectorB])).toEqual([
      dynamicConnectorA.id,
      dynamicConnectorB.id,
    ]);
  });

  it('ignores non-dynamic connectors even if their endpoint is missing', () => {
    const nonDynamicConnector = { ...connectorFromEndpoint(endpointA), isDynamic: false };
    expect(findStaleDynamicConnectorIds([], [nonDynamicConnector])).toEqual([]);
  });

  it('ignores connectors that are not .inference connectors', () => {
    const otherConnector = {
      ...dynamicConnectorA,
      actionTypeId: '.slack',
    };
    expect(findStaleDynamicConnectorIds([], [otherConnector])).toEqual([]);
  });

  it('ignores dynamic connectors without an inferenceId in config', () => {
    const connectorWithoutInferenceId = { ...dynamicConnectorA, config: {} };
    expect(findStaleDynamicConnectorIds([], [connectorWithoutInferenceId])).toEqual([]);
  });
});

describe('connectorFromEndpoint', () => {
  it('maps endpoint fields to the correct connector shape', () => {
    const endpoint = makeEndpoint({
      inference_id: '.my-model-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: 'my-model' },
    });

    expect(connectorFromEndpoint(endpoint)).toEqual({
      id: '.my-model-chat_completion',
      name: 'My Model',
      actionTypeId: '.inference',
      exposeConfig: true,
      config: {
        provider: 'elastic',
        taskType: 'chat_completion',
        inferenceId: '.my-model-chat_completion',
        providerConfig: { model_id: 'my-model' },
      },
      secrets: {},
      isPreconfigured: true,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
      isDynamic: true,
      isDeprecated: false,
    });
  });
});

describe('getConnectorIdFromEndpoint', () => {
  it('returns the inference_id as the connector id', () => {
    const endpoint = makeEndpoint({ inference_id: '.my-model-chat_completion' });
    expect(getConnectorIdFromEndpoint(endpoint)).toBe('.my-model-chat_completion');
  });
});

describe('getConnectorNameFromEndpoint', () => {
  it('returns display name from metadata if available', () => {
    const endpoint = makeEndpoint({
      inference_id: '.my-model-chat_completion',
      service_settings: {},
      metadata: {
        display: {
          name: 'Name Provided by EIS',
        },
      },
    });
    expect(getConnectorNameFromEndpoint(endpoint)).toBe('Name Provided by EIS');
  });

  it('falls back to inference_id when service_settings has no model_id', () => {
    const endpoint = makeEndpoint({
      inference_id: '.my-model-chat_completion',
      service_settings: {},
    });
    expect(getConnectorNameFromEndpoint(endpoint)).toBe('.my-model-chat_completion');
  });

  it('converts hyphens to spaces and title-cases the model id', () => {
    const endpoint = makeEndpoint({ service_settings: { model_id: 'some-model-name' } });
    expect(getConnectorNameFromEndpoint(endpoint)).toBe('Some Model Name');
  });

  it('returns the display name for rainbow-sprinkles', () => {
    const endpoint = makeEndpoint({ service_settings: { model_id: 'rainbow-sprinkles' } });
    expect(getConnectorNameFromEndpoint(endpoint)).toBe('Anthropic Claude Sonnet 3.7');
  });

  it('returns the display name for gp-llm-v2', () => {
    const endpoint = makeEndpoint({ service_settings: { model_id: 'gp-llm-v2' } });
    expect(getConnectorNameFromEndpoint(endpoint)).toBe('Anthropic Claude Sonnet 4.5');
  });

  it('replaces "Openai" with "OpenAI"', () => {
    const endpoint = makeEndpoint({ service_settings: { model_id: 'openai-gpt-4.1' } });
    expect(getConnectorNameFromEndpoint(endpoint)).toBe('OpenAI GPT 4.1');
  });

  it('handles a model_id with multiple OpenAI and GPT replacements', () => {
    const endpoint = makeEndpoint({
      service_settings: { model_id: 'openai-text-embedding-3-large' },
    });
    expect(getConnectorNameFromEndpoint(endpoint)).toBe('OpenAI Text Embedding 3 Large');
  });

  it.each(
    mockEISPreconfiguredEndpoints
      .filter((e) => e.service_settings?.model_id)
      .map((e) => [e.inference_id, e.service_settings!.model_id as string])
  )('returns a non-empty string name for mock endpoint %s', (_inferenceId, _modelId) => {
    const endpoint = makeEndpoint({ service_settings: { model_id: _modelId } });
    expect(typeof getConnectorNameFromEndpoint(endpoint)).toBe('string');
    expect(getConnectorNameFromEndpoint(endpoint).length).toBeGreaterThan(0);
  });
});
