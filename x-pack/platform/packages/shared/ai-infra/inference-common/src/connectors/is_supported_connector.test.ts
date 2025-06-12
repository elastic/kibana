/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType, RawConnector } from './connectors';
import {
  isSupportedConnectorType,
  isSupportedConnector,
  COMPLETION_TASK_TYPE,
} from './is_supported_connector';

const createRawConnector = (parts: Partial<RawConnector>): RawConnector => {
  return {
    id: 'id',
    actionTypeId: 'connector-type',
    name: 'some connector',
    config: {},
    ...parts,
  };
};

describe('isSupportedConnectorType', () => {
  it('returns true for supported connector types', () => {
    expect(isSupportedConnectorType(InferenceConnectorType.OpenAI)).toBe(true);
    expect(isSupportedConnectorType(InferenceConnectorType.Bedrock)).toBe(true);
    expect(isSupportedConnectorType(InferenceConnectorType.Gemini)).toBe(true);
    expect(isSupportedConnectorType(InferenceConnectorType.Inference)).toBe(true);
  });
  it('returns false for unsupported connector types', () => {
    expect(isSupportedConnectorType('anything-else')).toBe(false);
  });
});

describe('isSupportedConnector', () => {
  it('returns true for OpenAI connectors', () => {
    expect(
      isSupportedConnector(createRawConnector({ actionTypeId: InferenceConnectorType.OpenAI }))
    ).toBe(true);
  });

  it('returns true for Bedrock connectors', () => {
    expect(
      isSupportedConnector(createRawConnector({ actionTypeId: InferenceConnectorType.Bedrock }))
    ).toBe(true);
  });

  it('returns true for Gemini connectors', () => {
    expect(
      isSupportedConnector(createRawConnector({ actionTypeId: InferenceConnectorType.Gemini }))
    ).toBe(true);
  });

  it('returns true for OpenAI connectors with the right taskType', () => {
    expect(
      isSupportedConnector(
        createRawConnector({
          actionTypeId: InferenceConnectorType.Inference,
          config: { taskType: COMPLETION_TASK_TYPE },
        })
      )
    ).toBe(true);
  });

  it('returns false for OpenAI connectors with a bad taskType', () => {
    expect(
      isSupportedConnector(
        createRawConnector({
          actionTypeId: InferenceConnectorType.Inference,
          config: { taskType: 'embeddings' },
        })
      )
    ).toBe(false);
  });

  it('returns false for OpenAI connectors without taskType', () => {
    expect(
      isSupportedConnector(
        createRawConnector({
          actionTypeId: InferenceConnectorType.Inference,
          config: {},
        })
      )
    ).toBe(false);
  });
});
