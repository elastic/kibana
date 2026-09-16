/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { DEFAULT_CONTEXT_WINDOW, getContextWindow } from './context_budget';

const createMockConnector = (contextWindowSize?: number): InferenceConnector => ({
  type: InferenceConnectorType.OpenAI,
  isInferenceEndpoint: false,
  isPreconfigured: false,
  name: 'test-connector',
  connectorId: 'test-id',
  config: {
    ...(contextWindowSize !== undefined ? { contextWindowLength: contextWindowSize } : {}),
  },
  capabilities: {
    ...(contextWindowSize !== undefined ? { contextWindowSize } : {}),
  },
});

describe('getContextWindow', () => {
  it('reads the connector context window size', () => {
    expect(getContextWindow(createMockConnector(200_000))).toBe(200_000);
  });

  it('falls back to the default when the connector has no size', () => {
    expect(getContextWindow(createMockConnector())).toBe(DEFAULT_CONTEXT_WINDOW);
  });
});
