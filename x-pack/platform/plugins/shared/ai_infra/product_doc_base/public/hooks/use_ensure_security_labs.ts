/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { Logger } from '@kbn/logging';
import type { IUiSettingsClient } from '@kbn/core/public';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { ResourceTypes } from '@kbn/product-doc-common';
import type { SecurityLabsInstallStatusResponse } from '../../common/http_api/installation';
import type { ProductDocBasePluginStart } from '../types';

// Sentinels that mean no default AI connector/model is configured. Either can
// appear depending on which settings UI last wrote genAiSettings:defaultAIConnector
// (gen_ai_settings vs search_inference_endpoints "Use AI features" toggle).
const AI_DISABLED_SENTINELS = new Set(['NO_DEFAULT_MODEL', 'NO_DEFAULT_CONNECTOR']);

export interface EnsureSecurityLabsServices {
  productDocBase: ProductDocBasePluginStart;
  uiSettings: IUiSettingsClient;
  logger: Logger;
}

const isAiFeaturesDisabled = (uiSettings: IUiSettingsClient): boolean => {
  const defaultAIConnector = uiSettings.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const defaultAIConnectorOnly = uiSettings.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY
  );
  return AI_DISABLED_SENTINELS.has(defaultAIConnector) && defaultAIConnectorOnly === true;
};

/**
 * Ensures Security Labs content is installed for the default inference ID.
 * No-op when AI features are disabled, already installed, in error, or in progress.
 */
export const ensureSecurityLabsInstalled = async ({
  productDocBase,
  uiSettings,
  logger,
}: EnsureSecurityLabsServices): Promise<void> => {
  if (isAiFeaturesDisabled(uiSettings)) {
    logger.debug('Skipping Security Labs auto-install: Use AI features is disabled');
    return;
  }

  const inferenceId = await productDocBase.installation.getDefaultInferenceId({
    resourceType: ResourceTypes.securityLabs,
  });
  const statusResponse = (await productDocBase.installation.getStatus({
    inferenceId,
    resourceType: ResourceTypes.securityLabs,
  })) as SecurityLabsInstallStatusResponse;

  if (statusResponse.status === 'uninstalled') {
    logger.debug(
      `Auto-installing Security Labs content for inference ID [${inferenceId}] (status: ${statusResponse.status})`
    );
    await productDocBase.installation.install({
      inferenceId,
      resourceType: ResourceTypes.securityLabs,
    });
    return;
  }

  logger.debug(
    `Skipping Security Labs auto-install for inference ID [${inferenceId}] (status: ${statusResponse.status})`
  );
};

/**
 * Auto-installs Security Labs when Security Solution mounts (e.g. navigating to a
 * space with the security solution view). Safe to call repeatedly; skips when
 * already installed, in progress, or AI features are disabled.
 */
export const useEnsureSecurityLabs = (services: EnsureSecurityLabsServices): void => {
  const { productDocBase, uiSettings, logger } = services;

  useEffect(() => {
    ensureSecurityLabsInstalled({ productDocBase, uiSettings, logger }).catch((error) => {
      logger.error('Failed to auto-install Security Labs content');
      logger.error(error);
    });
  }, [productDocBase, uiSettings, logger]);
};
