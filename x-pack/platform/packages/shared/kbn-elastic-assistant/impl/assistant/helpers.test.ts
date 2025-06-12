/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector, getOptionalRequestParams } from './helpers';
import { AIConnector } from '../connectorland/connector_selector';

describe('helpers', () => {
  describe('getDefaultConnector', () => {
    const defaultConnector: AIConnector = {
      actionTypeId: '.gen-ai',
      isPreconfigured: false,
      isDeprecated: false,
      referencedByCount: 0,
      isMissingSecrets: false,
      isSystemAction: false,
      secrets: {},
      id: 'c5f91dc0-2197-11ee-aded-897192c5d6f5',
      name: 'OpenAI',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
      },
    };
    it('should return undefined if connectors array is undefined', () => {
      const connectors = undefined;
      const result = getDefaultConnector(connectors);

      expect(result).toBeUndefined();
    });

    it('should return undefined if connectors array is empty', () => {
      const connectors: AIConnector[] = [];
      const result = getDefaultConnector(connectors);

      expect(result).toBeUndefined();
    });

    it('should return the connector id if there is only one connector', () => {
      const connectors: AIConnector[] = [defaultConnector];
      const result = getDefaultConnector(connectors);

      expect(result).toBe(connectors[0]);
    });

    it('should return the connector id if there are multiple connectors', () => {
      const connectors: AIConnector[] = [
        defaultConnector,
        {
          ...defaultConnector,
          id: 'c7f91dc0-2197-11ee-aded-897192c5d633',
          name: 'OpenAI',
          config: {
            apiProvider: 'OpenAI 2',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
          },
        },
      ];
      const result = getDefaultConnector(connectors);
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
