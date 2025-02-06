/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { ActionTypeRegistry } from '../action_type_registry';
import { setupTestServers } from './lib';
import { connectorTypes } from './mocks/connector_types';
import { actionsConfigMock } from '../actions_config.mock';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionTypeConfig, Services } from '../types';

jest.mock('../action_type_registry', () => {
  const actual = jest.requireActual('../action_type_registry');
  return {
    ...actual,
    ActionTypeRegistry: jest.fn().mockImplementation((opts) => {
      return new actual.ActionTypeRegistry(opts);
    }),
  };
});

describe('Connector type config checks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let actionTypeRegistry: ActionTypeRegistry;

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedActionTypeRegistry = jest.requireMock('../action_type_registry');
    expect(mockedActionTypeRegistry.ActionTypeRegistry).toHaveBeenCalledTimes(1);
    actionTypeRegistry = mockedActionTypeRegistry.ActionTypeRegistry.mock.results[0].value;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  test('ensure connector types list up to date', () => {
    expect(connectorTypes).toEqual(actionTypeRegistry.getAllTypes());
  });

  for (const connectorTypeId of connectorTypes) {
    const skipConnectorType = ['.gen-ai', '.inference'];
    if (skipConnectorType.includes(connectorTypeId)) {
      continue;
    }
    test(`detect connector type changes for: ${connectorTypeId}`, async () => {
      const {
        getService,
        validate: { config, params, secrets },
      } = actionTypeRegistry.get(connectorTypeId);

      // SubActionConnector
      if (getService) {
        let connectorConfig: ActionTypeConfig = {};

        if (connectorTypeId === '.microsoft_defender_endpoint') {
          connectorConfig = {
            clientId: 'foo',
            tenantId: 'foo-foo',
            oAuthServerUrl: 'https://_fake_auth.com/',
            oAuthScope: 'some-scope',
            apiUrl: 'https://_face_api_.com',
          };
        }

        const subActions = getService({
          config: connectorConfig,
          configurationUtilities: actionsConfigMock.create(),
          connector: { id: 'foo', type: 'bar' },
          logger: loggerMock.create(),
          secrets: {},
          services: {} as Services,
        }).getSubActions();

        subActions.forEach((subAction) => {
          // @ts-ignore
          if (subAction.schema?.getSchema) {
            // @ts-ignore
            expect(subAction.schema.getSchema().describe()).toMatchSnapshot();
          }
        });
      }

      expect(config.schema.getSchema!().describe()).toMatchSnapshot();
      expect(secrets.schema.getSchema!().describe()).toMatchSnapshot();
      expect(params.schema.getSchema!().describe()).toMatchSnapshot();
    });
  }
});
