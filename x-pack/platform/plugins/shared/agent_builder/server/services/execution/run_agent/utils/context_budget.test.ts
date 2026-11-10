/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { computeContextBudget, getContextWindow } from './context_budget';

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
  it('returns the connector context window size', () => {
    expect(getContextWindow(createMockConnector(200_000))).toBe(200_000);
  });

  it('falls back to the default window when the connector has no size', () => {
    const connector = createMockConnector();
    connector.config = {};
    expect(getContextWindow(connector)).toBe(128_000);
  });
});

describe('computeContextBudget', () => {
  it('should compute budget from connector context window size', () => {
    const budget = computeContextBudget(createMockConnector(128000));

    expect(budget.totalBudget).toBe(128000);
    expect(budget.historyBudget).toBe(89600); // 128000 * 0.7 (1 - RESERVED_FRACTION)
  });

  it('should use default context window when connector has no size', () => {
    const connector = createMockConnector();
    connector.config = {};
    const budget = computeContextBudget(connector);

    expect(budget.totalBudget).toBe(128000);
    expect(budget.historyBudget).toBe(89600);
  });

  it('should scale with large context windows', () => {
    const budget = computeContextBudget(createMockConnector(1000000));

    expect(budget.totalBudget).toBe(1000000);
    expect(budget.historyBudget).toBe(700000);
  });
});
