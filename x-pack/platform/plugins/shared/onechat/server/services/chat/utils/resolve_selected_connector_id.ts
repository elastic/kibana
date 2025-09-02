/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { NO_DEFAULT_CONNECTOR } from '@kbn/gen-ai-settings-plugin/common/constants';

/**
 * Resolves the connectorId to use, given the GenAI settings.
 */
export const resolveSelectedConnectorId = async ({
  uiSettings,
  savedObjects,
  request,
  connectorId,
}: {
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  request: KibanaRequest;
  connectorId?: string;
}): Promise<string | undefined> => {
  const soClient = savedObjects.getScopedClient(request);
  const uiSettingsClient = uiSettings.asScopedToClient(soClient);

  const [defaultConnectorSetting, defaultOnly] = await Promise.all([
    uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR),
    uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY),
  ]);

  if (defaultOnly && defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR) {
    return defaultConnectorSetting;
  }

  if (connectorId) {
    return connectorId;
  }

  if (defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR) {
    return defaultConnectorSetting;
  }

  return undefined;
};
