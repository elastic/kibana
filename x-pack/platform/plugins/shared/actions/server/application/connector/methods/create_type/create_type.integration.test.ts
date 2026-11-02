/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '../../../../actions_config.mock';
import { ActionTypeRegistry } from '../../../../action_type_registry';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ensureSufficientLicense } from '../../../../lib/ensure_sufficient_license';
import { getMeta } from '@kbn/connector-specs';
import type { ConnectorTypeConversionServices } from '../../../../lib/single_file_connectors/create_connector_from_spec';
import { createConnectorType } from './create_type';

describe('createConnectorType with real spec conversion', () => {
  it('registers a no-auth HTTP connector type', () => {
    const configUtils = actionsConfigMock.create();
    const actionTypeRegistry = new ActionTypeRegistry({
      licensing: licensingMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      taskRunnerFactory: { create: jest.fn() } as never,
      actionsConfigUtils: configUtils,
      licenseState: licenseStateMock.create(),
      inMemoryConnectors: [],
    });
    const registerType = jest.fn((actionType) => {
      ensureSufficientLicense(actionType);
      actionTypeRegistry.register(actionType);
    });
    const conversionServices = {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn(),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn(),
      getRelayClient: jest.fn(),
      getConnectorJwtSigner: jest.fn(),
    } as unknown as ConnectorTypeConversionServices;

    expect(
      createConnectorType({
        actionTypeRegistry,
        conversionServices,
        registerType,
        request: {
          id: '.acme',
          displayName: 'Acme',
          description: 'Acme connector',
          config: [{ name: 'baseUrl', type: 'string', required: true, label: 'Base URL' }],
          auth: { type: 'none' },
          actions: {
            ping: {
              description: 'Check the Acme service',
              scope: 'read',
              input: [
                { name: 'query', type: 'string', required: false, description: 'Search query' },
              ],
              request: { method: 'GET', url: '{{config.baseUrl}}' },
            },
          },
        },
      })
    ).toEqual({ id: '.acme' });
    expect(registerType).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.acme', minimumLicenseRequired: 'enterprise' })
    );
    const registeredSpec = registerType.mock.calls[0][0].spec;
    expect(getMeta(registeredSpec.schema.shape.baseUrl)).toMatchObject({ label: 'Base URL' });
    expect(getMeta(registeredSpec.actions.ping.input.shape.query)).toMatchObject({
      label: 'query',
      helpText: 'Search query',
    });
  });
});
