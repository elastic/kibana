/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticModelIds,
  InferenceConnectorType,
  InferenceEndpointProvider,
} from '@kbn/inference-common';
import { createInferenceConnectorMock } from '../../../../test_utils';
import { getElasticModelProvider, getModelId, getProvider } from './connector_config';

describe('getProvider', () => {
  it('returns the provider for an inference connector', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {
        provider: 'elastic',
      },
    });
    expect(getProvider(connector)).toEqual('elastic');
  });
  it('returns undefined if the config is not exposed', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {},
    });
    expect(getProvider(connector)).toBe(undefined);
  });
  it('throws when called for a wrong connector type', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.OpenAI,
    });
    expect(() => getProvider(connector)).toThrowErrorMatchingInlineSnapshot(
      `"trying to get provider for a non-inference connector (.gen-ai)"`
    );
  });
});

describe('getModelId', () => {
  it('returns the modelId for an inference connector', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {
        providerConfig: {
          model_id: 'gpt-4o',
        },
      },
    });
    expect(getModelId(connector)).toEqual('gpt-4o');
  });
  it('returns undefined if the config is not exposed', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {},
    });
    expect(getModelId(connector)).toBe(undefined);
  });
  it('throws when called for a wrong connector type', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.OpenAI,
    });
    expect(() => getModelId(connector)).toThrowErrorMatchingInlineSnapshot(
      `"trying to get modelId for a non-inference connector (.gen-ai)"`
    );
  });
});

describe('getElasticModelProvider', () => {
  it('returns the provider for an elastic inference connector with a known modelId', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {
        provider: 'elastic',
        providerConfig: {
          model_id: elasticModelIds.RainbowSprinkles,
        },
      },
    });
    expect(getElasticModelProvider(connector)).toEqual(InferenceEndpointProvider.AmazonBedrock);
  });

  it('returns undefined for an elastic inference connector with an unknown modelId', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {
        provider: 'elastic',
        providerConfig: {
          model_id: 'idk',
        },
      },
    });
    expect(getElasticModelProvider(connector)).toBe(undefined);
  });

  it('throws when called for a wrong connector type', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.OpenAI,
    });
    expect(() => getElasticModelProvider(connector)).toThrowErrorMatchingInlineSnapshot(
      `"trying to get provider for a non-inference connector (.gen-ai)"`
    );
  });
  it('throws when called for a wrong provider', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {
        provider: 'openai',
      },
    });
    expect(() => getElasticModelProvider(connector)).toThrowErrorMatchingInlineSnapshot(
      `"trying to retrieve model provider for a non-elastic inference endpoint (openai)"`
    );
  });
});
