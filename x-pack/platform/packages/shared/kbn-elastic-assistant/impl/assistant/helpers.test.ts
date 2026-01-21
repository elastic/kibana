/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector, getOptionalRequestParams } from './helpers';
import type { AIConnector } from '../connectorland/connector_selector';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

describe('helpers', () => {
  describe('getDefaultConnector', () => {
    const defaultConnector: AIConnector = createMockActionConnector({
      actionTypeId: '.gen-ai',
      secrets: {},
      id: 'c5f91dc0-2197-11ee-aded-897192c5d6f5',
      name: 'OpenAI',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
      },
    });

    const connector2: AIConnector = {
      ...defaultConnector,
      id: 'c7f91dc0-2197-11ee-aded-897192c5d633',
      name: 'OpenAI',
      config: {
        apiProvider: 'OpenAI 2',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
      },
    };

    const clientGet = jest.fn();

    const settings = {
      client: {
        get: clientGet,
      },
    } as unknown as SettingsStart;

    beforeEach(() => {
      jest.clearAllMocks();
      clientGet.mockImplementation((key: string) => {
        return undefined;
      });
    });

    it('should return undefined if connectors array is undefined', () => {
      const connectors = undefined;
      const result = getDefaultConnector(connectors, settings);

      expect(result).toBeUndefined();
    });

    it('should return undefined if connectors array is empty', () => {
      const connectors: AIConnector[] = [];
      const result = getDefaultConnector(connectors, settings);

      expect(result).toBeUndefined();
    });

    it('should return the first connector if there is only one connector available', () => {
      const connectors: AIConnector[] = [defaultConnector];
      const result = getDefaultConnector(connectors, settings);

      expect(result).toBe(connectors[0]);
    });

    it('should return the default connector if there are multiple connectors and default connector is defined', () => {
      clientGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return defaultConnector.id;
        }
        return undefined;
      });
      const connectors: AIConnector[] = [defaultConnector, connector2];
      const result = getDefaultConnector(connectors, settings);
      expect(result).toBe(defaultConnector);
    });

    it('should return the default connector if there are multiple connectors and default connector is defined but they are in a different order', () => {
      clientGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return defaultConnector.id;
        }
        return undefined;
      });
      const connectors: AIConnector[] = [connector2, defaultConnector];
      const result = getDefaultConnector(connectors, settings);
      expect(result).toBe(defaultConnector);
    });

    it('should return the first connector if there are multiple connectors and no default connector is defined', () => {
      clientGet.mockImplementation(() => {
        return undefined;
      });

      const connectors: AIConnector[] = [connector2, defaultConnector];
      const result = getDefaultConnector(connectors, settings);
      expect(result).toBe(connectors[0]);
    });

    it('should return the first connector if there are multiple connectors and a default connector is defined but it does not exist', () => {
      clientGet.mockImplementation((key: string) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'randomConnectorIdThatDoesNotExist';
        }
        return undefined;
      });

      const connectors: AIConnector[] = [connector2, defaultConnector];
      const result = getDefaultConnector(connectors, settings);
      expect(result).toBe(connectors[0]);
    });
  });

  describe('getOptionalRequestParams', () => {
    it('should return the optional request params when alerts is true', () => {
      const params = {
        alertsIndexPattern: 'indexPattern',
        size: 10,
      };

      const result = getOptionalRequestParams(params);

      expect(result).toEqual({
        alertsIndexPattern: 'indexPattern',
        size: 10,
      });
    });
  });
});
