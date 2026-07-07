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
  MessageRole,
} from '@kbn/inference-common';
import { applyProviderTransforms } from './apply_provider_transforms';
import { createInferenceConnectorMock } from '../../../../test_utils';

describe('applyProviderTransforms', () => {
  it('fixes array schema definition for rainbow-sprinkles', () => {
    const connector = createInferenceConnectorMock({
      type: InferenceConnectorType.Inference,
      config: {
        provider: InferenceEndpointProvider.Elastic,
        providerConfig: {
          model_id: elasticModelIds.RainbowSprinkles,
        },
      },
    });

    const request = applyProviderTransforms({
      connector,
      messages: [{ role: MessageRole.User, content: 'quest' }],
      tools: {
        myTool: {
          description: 'some cool tool',
          schema: {
            type: 'object',
            properties: {
              someString: {
                type: 'string',
                description: 'some string',
              },
              someArray: {
                description: 'some array',
                type: 'array',
                items: { type: 'string' },
              },
              someArrayWithoutDescription: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
      simulatedFunctionCalling: false,
    });

    expect(request.tools).toEqual({
      myTool: {
        description: 'some cool tool',
        schema: {
          properties: {
            someArray: {
              description: 'some array. Must be provided as a JSON array',
              items: {
                type: 'string',
              },
              type: 'array',
            },
            someArrayWithoutDescription: {
              description: 'Must be provided as a JSON array',
              items: {
                type: 'string',
              },
              type: 'array',
            },
            someString: {
              description: 'some string',
              type: 'string',
            },
          },
          type: 'object',
        },
      },
    });
  });
});
