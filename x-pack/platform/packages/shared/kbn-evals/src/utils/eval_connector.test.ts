/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { InferenceEndpointDefinition } from './inference_endpoint_definition';
import {
  isInferenceEndpointDefinition,
  toStackConnectorDefinition,
  type StackConnectorDefinition,
} from './eval_connector';

const endpoint: InferenceEndpointDefinition = {
  type: 'inference_endpoint',
  id: 'eis-gpt-4o',
  name: 'EIS GPT-4o',
  inferenceId: '.openai-gpt-4o-chat_completion',
  provider: 'elastic',
  taskType: 'chat_completion',
};

describe('toStackConnectorDefinition', () => {
  it('tags a connector read from the environment without altering its other fields', () => {
    const connector: AvailableConnectorWithId = {
      id: 'my-connector',
      name: 'My Connector',
      actionTypeId: '.gen-ai',
      config: { defaultModel: 'gpt-4o' },
      secrets: { apiKey: 'secret' },
    };

    expect(toStackConnectorDefinition(connector)).toEqual({
      ...connector,
      type: 'stack_connector',
    });
  });
});

describe('isInferenceEndpointDefinition', () => {
  it('returns true for an inference endpoint definition', () => {
    expect(isInferenceEndpointDefinition(endpoint)).toBe(true);
  });

  it('returns false for a stack connector', () => {
    const connector: StackConnectorDefinition = {
      type: 'stack_connector',
      id: 'my-connector',
      name: 'My Connector',
      actionTypeId: '.gen-ai',
      config: {},
      secrets: {},
    };
    expect(isInferenceEndpointDefinition(connector)).toBe(false);
  });

  it('returns false for a .inference stack connector, which the Actions API still owns', () => {
    const connector: StackConnectorDefinition = {
      type: 'stack_connector',
      id: 'local-inference',
      name: 'Local Inference',
      actionTypeId: '.inference',
      config: { provider: 'openai', taskType: 'chat_completion' },
      secrets: {},
    };
    expect(isInferenceEndpointDefinition(connector)).toBe(false);
  });
});
