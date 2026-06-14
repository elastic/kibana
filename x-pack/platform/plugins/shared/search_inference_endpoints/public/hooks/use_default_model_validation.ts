/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { NO_DEFAULT_MODEL } from '../../common/constants';
import { useConnectors } from './use_connectors';
import type { DefaultModelSettingsState } from './use_default_model_settings';
import { getModelEOLDate, getModelEOLMessage, getModelStatus } from '../utils/eis_utils';
import { EisModelStatus } from '../types';

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
  const { data: connectors, isLoading: connectorsLoading } = useConnectors();

  return useMemo(() => {
    if (!state.enableAi) {
      return { errors: [], isValid: true };
    }

    const errors: string[] = [];

    const requiresGlobalDefaultModel = !state.featureSpecificModels;
    const connectorExists =
      connectors?.some((c) => c.connectorId === state.defaultModelId) ?? false;
    const selectedConnector = connectors?.find((c) => c.connectorId === state.defaultModelId);

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
      !connectorsLoading
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
    } else if (selectedConnector && selectedConnector.metadata) {
      const modelStatus = getModelStatus(selectedConnector.metadata);
      if (modelStatus === EisModelStatus.DeprecatedEOL) {
        const eolDate = getModelEOLDate(selectedConnector.metadata)?.format('l') ?? null;
        errors.push(getModelEOLMessage(eolDate));
      }
    }

    return {
      errors,
      isValid: errors.length === 0,
    };
  }, [
    state.enableAi,
    state.featureSpecificModels,
    state.defaultModelId,
    connectors,
    connectorsLoading,
  ]);
};
