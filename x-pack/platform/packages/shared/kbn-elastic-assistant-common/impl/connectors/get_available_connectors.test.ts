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
import { getAvailableAiConnectors } from './get_available_connectors';

describe('getAvailableConnectors', () => {
  const connectors = [
    {
      id: 'connectorId1',
    },
    {
      id: 'connectorId2',
    },
    {
      id: 'connectorId3',
    },
  ];

  const settingsClientGet = jest.fn().mockImplementation((settingKey) => {
    if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
      return 'connectorId1';
    }
    if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
      return false;
    }
  });

  const settings = {
    client: {
      get: settingsClientGet,
    },
  } as unknown as SettingsStart;

  it('should return all connectors if default connector is not set', () => {
    const result = getAvailableAiConnectors({
      allAiConnectors: connectors,
      settings,
    });

    expect(result).toEqual(connectors);
  });

  it('should return only the default connector if default connector only is set', () => {
    settingsClientGet.mockImplementation((settingKey) => {
      if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
        return 'connectorId1';
      }
      if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
        return true;
      }
    });

    const result = getAvailableAiConnectors({
      allAiConnectors: connectors,
      settings,
    });

    expect(result.length).toEqual(1);
    expect(result[0].id).toEqual('connectorId1');
  });

  it('should return all connectors if default connector only is set but default connector is not found', () => {
    settingsClientGet.mockImplementation((settingKey) => {
      if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
        return 'unknownConnectorId';
      }
      if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
        return true;
      }
    });

    const result = getAvailableAiConnectors({
      allAiConnectors: connectors,
      settings,
    });

    expect(result).toEqual(connectors);
  });
});
