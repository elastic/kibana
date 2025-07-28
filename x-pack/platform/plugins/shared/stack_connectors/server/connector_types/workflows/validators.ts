/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import * as i18n from './translations';
import type { WorkflowsPublicConfigurationType, WorkflowsSecretConfigurationType } from './types';

export const validateWorkflowsConfig = (
  configObject: WorkflowsPublicConfigurationType,
  validatorServices: { configurationUtilities: ActionsConfigurationUtilities }
) => {
  // No validation needed for internal API
};

export const validateConnector = (
  config: WorkflowsPublicConfigurationType,
  secrets: WorkflowsSecretConfigurationType
): string | null => {
  // No validation needed for internal API
  return null;
};

export const validateAndNormalizeUrl = (
  configurationUtilities: ActionsConfigurationUtilities,
  url: string
): string => {
  try {
    configurationUtilities.ensureUriAllowed(url);
  } catch (allowListError) {
    throw new Error(i18n.INVALID_URL(url, allowListError.message));
  }

  return url;
};

export const removeSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);
