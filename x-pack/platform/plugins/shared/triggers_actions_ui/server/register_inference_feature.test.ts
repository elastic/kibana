/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CONNECTOR_BUILDER_INFERENCE_FEATURE_ID } from '../common/connector_type_generation';
import type { ConnectorBuilderInferenceEndpoints } from './register_inference_feature';
import { registerConnectorBuilderInferenceFeature } from './register_inference_feature';

describe('registerConnectorBuilderInferenceFeature', () => {
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when the plugin is missing', () => {
    registerConnectorBuilderInferenceFeature(undefined, logger);

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('registers a chat completion feature', () => {
    const register = jest.fn().mockReturnValue({ ok: true });
    const searchInferenceEndpoints = {
      features: { register },
    } as unknown as ConnectorBuilderInferenceEndpoints;

    registerConnectorBuilderInferenceFeature(searchInferenceEndpoints, logger);

    expect(register).toHaveBeenCalledWith({
      featureId: CONNECTOR_BUILDER_INFERENCE_FEATURE_ID,
      featureName: 'Connector builder',
      featureDescription: 'Model used to draft connector types from API documentation.',
      taskType: 'chat_completion',
      recommendedEndpoints: [],
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns when registration fails', () => {
    const register = jest.fn().mockReturnValue({ ok: false, error: 'duplicate feature' });
    const searchInferenceEndpoints = {
      features: { register },
    } as unknown as ConnectorBuilderInferenceEndpoints;

    registerConnectorBuilderInferenceFeature(searchInferenceEndpoints, logger);

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to register inference feature "connector_builder": duplicate feature'
    );
  });
});
