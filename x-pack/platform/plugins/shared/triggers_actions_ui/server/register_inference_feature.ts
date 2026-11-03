/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { CONNECTOR_BUILDER_INFERENCE_FEATURE_ID } from '../common/connector_type_generation';

/**
 * Structural slice of the searchInferenceEndpoints setup contract.
 * Imported as a local type because that plugin's package graph already reaches this plugin.
 */
export interface ConnectorBuilderInferenceEndpoints {
  features: {
    register: (feature: {
      featureId: string;
      featureName: string;
      featureDescription: string;
      taskType: 'chat_completion';
      recommendedEndpoints: string[];
    }) => { ok: true } | { ok: false; error: string };
  };
}

/** Registers the Connector builder model so admins can pick it in Feature Settings. */
export const registerConnectorBuilderInferenceFeature = (
  searchInferenceEndpoints: ConnectorBuilderInferenceEndpoints | undefined,
  logger: Logger
): void => {
  if (!searchInferenceEndpoints) {
    return;
  }

  const result = searchInferenceEndpoints.features.register({
    featureId: CONNECTOR_BUILDER_INFERENCE_FEATURE_ID,
    featureName: i18n.translate('xpack.triggersActionsUI.inferenceFeature.connectorBuilderName', {
      defaultMessage: 'Connector builder',
    }),
    featureDescription: i18n.translate(
      'xpack.triggersActionsUI.inferenceFeature.connectorBuilderDescription',
      { defaultMessage: 'Model used to draft connector types from API documentation.' }
    ),
    taskType: 'chat_completion',
    recommendedEndpoints: [],
  });

  if (result.ok) {
    logger.debug(`Registered inference feature "${CONNECTOR_BUILDER_INFERENCE_FEATURE_ID}"`);
    return;
  }

  logger.warn(
    `Failed to register inference feature "${CONNECTOR_BUILDER_INFERENCE_FEATURE_ID}": ${result.error}`
  );
};
