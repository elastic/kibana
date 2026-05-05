/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { NO_DEFAULT_MODEL } from '../../common/constants';
import { useConnectorExists } from './use_connector_exists';
import type { DefaultModelSettingsState } from './use_default_model_settings';

export interface DefaultModelValidationResult {
  errors: readonly string[];
  isValid: boolean;
}

// Validates the Default model section: when AI is on and feature-specific models are off, a global
// default connector is required. When feature-specific models are on, an empty global default is
// allowed (recommendations-only / per-feature lists). Otherwise requires a selected model that
// resolves to an existing connector. Always valid when AI is off.
export const useDefaultModelValidation = (
  state: DefaultModelSettingsState
): DefaultModelValidationResult => {
  const { exists: connectorExists, loading: connectorExistsLoading } = useConnectorExists(
    state.defaultModelId
  );

  return useMemo(() => {
    if (!state.enableAi) {
      return { errors: [], isValid: true };
    }

    const errors: string[] = [];

    const requiresGlobalDefaultModel = !state.featureSpecificModels;

    if (requiresGlobalDefaultModel && state.defaultModelId === NO_DEFAULT_MODEL) {
      errors.push(
        i18n.translate(
          'xpack.searchInferenceEndpoints.settings.defaultModel.error.selectDefaultModel',
          {
            defaultMessage: 'Select a default model to save changes.',
          }
        )
      );
    } else if (
      state.defaultModelId !== NO_DEFAULT_MODEL &&
      !connectorExists &&
      !connectorExistsLoading
    ) {
      errors.push(
        i18n.translate(
          'xpack.searchInferenceEndpoints.settings.defaultModel.error.connectorNotExist',
          {
            defaultMessage:
              'The model previously selected is not available. Please select a different option.',
          }
        )
      );
    }

    return {
      errors,
      isValid: errors.length === 0,
    };
  }, [
    state.enableAi,
    state.featureSpecificModels,
    state.defaultModelId,
    connectorExists,
    connectorExistsLoading,
  ]);
};
