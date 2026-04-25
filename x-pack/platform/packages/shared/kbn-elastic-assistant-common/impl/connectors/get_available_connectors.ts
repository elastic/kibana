/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

interface Props<T extends { id: string }> {
  allAiConnectors: T[];
  settings: SettingsStart;
}

/**
 * Get the available AI connectors based on the default AI connector settings. This is only a
 * client side filter and does not make any API calls.
 *
 * @param allAiConnectors - The list of all AI connectors.
 * @param settings - Kibana SettingsStart.
 * @returns The available AI connectors.
 */
export const getAvailableAiConnectors = <T extends { id: string }>({
  allAiConnectors,
  settings,
}: Props<T>): T[] => {
  const defaultAiConnectorId = settings.client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const defaultAiConnectorOnly = settings.client.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  const availableConnectors = allAiConnectors.filter((connector) => {
    if (defaultAiConnectorOnly) {
      return connector.id === defaultAiConnectorId;
    }
    return true;
  });

  const aiConnectors = availableConnectors.length > 0 ? availableConnectors : allAiConnectors;

  return aiConnectors;
};
