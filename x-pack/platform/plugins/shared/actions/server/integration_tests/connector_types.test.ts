/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConfigSchema } from '@kbn/config-schema';
import { z, setLazySchemaDisabled } from '@kbn/zod';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ActionTypeRegistry } from '../action_type_registry';
import { setupTestServers } from './lib';
import { connectorTypes } from './mocks/connector_types';
import { actionsConfigMock } from '../actions_config.mock';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionTypeConfig, Services } from '../types';
import { connectorsSpecs } from '@kbn/connector-specs';

jest.mock('../action_type_registry', () => {
  const actual = jest.requireActual('../action_type_registry');
  return {
    ...actual,
    ActionTypeRegistry: jest.fn().mockImplementation((opts) => {
      return new actual.ActionTypeRegistry(opts);
    }),
  };
});

const mockTee = jest.fn();

const mockCreate = jest.fn().mockImplementation(() => ({
  tee: mockTee.mockReturnValue([jest.fn(), jest.fn()]),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    api_key: '123',
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('Connector type config checks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let actionTypeRegistry: ActionTypeRegistry;

  beforeAll(async () => {
    setLazySchemaDisabled(true);
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedActionTypeRegistry = jest.requireMock('../action_type_registry');
    expect(mockedActionTypeRegistry.ActionTypeRegistry).toHaveBeenCalledTimes(1);
    actionTypeRegistry = mockedActionTypeRegistry.ActionTypeRegistry.mock.results[0].value;
  });

  afterAll(async () => {
    setLazySchemaDisabled(false);
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  test('ensure connector types list up to date', () => {
    const connectorSpecIds = Object.values(connectorsSpecs).map(({ metadata }) => metadata.id);
    expect([...connectorTypes, ...connectorSpecIds].sort()).toEqual(
      actionTypeRegistry.getAllTypes().sort()
    );
  });

  for (const connectorTypeId of connectorTypes) {
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
        } else if (connectorTypeId === '.gen-ai') {
          connectorConfig = {
            apiUrl: 'https//_fake_api_.com',
            provider: 'Azure Open AI',
          };
        } else if (connectorTypeId === '.bedrock') {
          connectorConfig = {
            apiUrl: 'https://_face_api_.com',
          };
        } else if (connectorTypeId === '.mcp') {
          connectorConfig = {
            serverUrl: 'https://_fake_mcp_.com',
            hasAuth: false,
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
          if (subAction.schema && isConfigSchema(subAction.schema)) {
            expect(
              (subAction.schema.getSchema() as unknown as { describe(): unknown }).describe()
            ).toMatchSnapshot();
          }
        });
      }

      const toJsonSchema = (schema: unknown) => {
        const { $schema, ...jsonSchema } = z.toJSONSchema(schema as z.ZodType, {
          unrepresentable: 'any',
          io: 'input',
        }) as Record<string, unknown>;
        return jsonSchema;
      };

      expect(toJsonSchema(config.schema as z.ZodType)).toMatchSnapshot();
      expect(toJsonSchema(secrets.schema as z.ZodType)).toMatchSnapshot();
      expect(toJsonSchema(params!.schema as z.ZodType)).toMatchSnapshot();
    });
  }
});
