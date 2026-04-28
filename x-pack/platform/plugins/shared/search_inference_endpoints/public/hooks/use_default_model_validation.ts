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

/**
 * Validation for the Default model section of Feature settings.
 *
 * When AI features are disabled (the master toggle is off), the section is always
 * considered valid -- nothing needs to be configured.
 *
 * When AI features are enabled:
 *  - A real default model MUST be selected. "No default model" is not a savable
 *    state while AI features are on; Save stays disabled until a model is picked.
 *  - If the underlying connector for the selected default no longer exists, flag it.
 */
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

    if (state.defaultModelId === NO_DEFAULT_MODEL) {
      errors.push(
        i18n.translate(
          'xpack.searchInferenceEndpoints.settings.defaultModel.error.selectDefaultModel',
          {
            defaultMessage: 'Select a default model to save changes.',
          }
        )
      );
    } else if (!connectorExists && !connectorExistsLoading) {
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
  }, [state.enableAi, state.defaultModelId, connectorExists, connectorExistsLoading]);
};
