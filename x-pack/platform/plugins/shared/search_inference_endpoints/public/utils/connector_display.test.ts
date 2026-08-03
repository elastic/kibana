/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';
import { getConnectorIcon } from './connector_display';

const createConnector = (overrides: Partial<InferenceConnector>): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: 'test-connector',
  connectorId: 'test-id',
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
  ...overrides,
});

describe('getConnectorIcon', () => {
  it('returns openai icon for OpenAI connectors', () => {
    const connector = createConnector({
      type: InferenceConnectorType.OpenAI,
      config: { apiProvider: 'OpenAI' },
    });
    expect(getConnectorIcon(connector)).not.toBe('compute');
  });

  it('returns azureopenai icon for Azure OpenAI connectors', () => {
    const connector = createConnector({
      type: InferenceConnectorType.OpenAI,
      config: { apiProvider: 'Azure OpenAI' },
    });
    expect(getConnectorIcon(connector)).not.toBe('compute');
  });

  it('returns compute fallback for unknown provider', () => {
    const connector = createConnector({
      type: InferenceConnectorType.Inference,
      config: { service: 'unknown_service_xyz' },
    });
    expect(getConnectorIcon(connector)).toBe('compute');
  });
});
