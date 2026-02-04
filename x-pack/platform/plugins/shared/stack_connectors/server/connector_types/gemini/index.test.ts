/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import axios from 'axios';
import { configValidator, getConnectorType, secretsValidator } from '.';
import type { Config, Secrets } from '@kbn/connector-schemas/gemini';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { DEFAULT_MODEL } from '@kbn/connector-schemas/gemini';

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);

let connectorType: SubActionConnectorType<Config, Secrets>;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

describe('Gemini Connector', () => {
  beforeEach(() => {
    configurationUtilities = actionsConfigMock.create();
    connectorType = getConnectorType();
  });
  test('exposes the connector as `Google Gemini` with id `.gemini`', () => {
    expect(connectorType.id).toEqual('.gemini');
    expect(connectorType.name).toEqual('Google Gemini');
  });

  describe('config validation', () => {
    test('config validation passes when only required fields are provided', () => {
      const config: Config = {
        apiUrl: `https://us-central1-aiplatform.googleapis.com/v1/projects/test-gcpProject/locations/us-central-1/publishers/google/models/${DEFAULT_MODEL}:generateContent`,
        defaultModel: DEFAULT_MODEL,
        gcpRegion: 'us-central-1',
        gcpProjectID: 'test-gcpProject',
      };

      expect(configValidator(config, { configurationUtilities })).toEqual(config);
    });

    test('config validation failed when a url is invalid', () => {
      const config: Config = {
        apiUrl: 'example.com/do-something',
        defaultModel: DEFAULT_MODEL,
        gcpRegion: 'us-central-1',
        gcpProjectID: 'test-gcpProject',
      };
      expect(() => {
        configValidator(config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring Google Gemini action: Error: URL Error: Invalid URL: example.com/do-something"`
      );
    });

    test('config validation returns an error if the specified URL is not added to allowedHosts', () => {
      const configUtils = {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (_: string) => {
          throw new Error(`target url is not present in allowedHosts`);
        },
      };

      const config: Config = {
        apiUrl: 'http://mylisteningserver.com:9200/endpoint',
        defaultModel: DEFAULT_MODEL,
        gcpRegion: 'us-central-1',
        gcpProjectID: 'test-gcpProject',
      };

      expect(() => {
        configValidator(config, { configurationUtilities: configUtils });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring Google Gemini action: Error: error validating url: target url is not present in allowedHosts"`
      );
    });
  });

  describe('secrets validation', () => {
    test('secrets validation passes when valid service_account credentials are provided', () => {
      const secrets: Secrets = {
        credentialsJson: JSON.stringify({
          type: 'service_account',
          project_id: 'test-project',
        }),
      };

      expect(secretsValidator(secrets, { configurationUtilities })).toEqual(secrets);
    });

    test('secrets validation fails when external_account credentials are provided', () => {
      const secrets: Secrets = {
        credentialsJson: JSON.stringify({
          type: 'external_account',
          credential_source: {
            file: '/etc/passwd',
          },
        }),
      };

      expect(() => {
        secretsValidator(secrets, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring Google Gemini secrets: Error: Invalid credential type. Only \\"service_account\\" credentials are supported. Type was \\"external_account\\"."`
      );
    });

    test('secrets validation fails when invalid JSON is provided', () => {
      const secrets: Secrets = {
        credentialsJson: '{ invalid json }',
      };

      expect(() => {
        secretsValidator(secrets, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring Google Gemini secrets: Error: Invalid JSON format for credentials."`
      );
    });

    test('secrets validation fails when credentialsJson is missing', () => {
      const secrets: Secrets = {
        credentialsJson: '',
      };

      expect(() => {
        secretsValidator(secrets, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Error configuring Google Gemini secrets: Error: Google Service Account credentials JSON is required."`
      );
    });
  });
});
