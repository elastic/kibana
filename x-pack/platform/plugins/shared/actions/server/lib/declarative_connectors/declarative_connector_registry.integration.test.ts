/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { actionsConfigMock } from '../../actions_config.mock';
import { ActionTypeRegistry } from '../../action_type_registry';
import { licenseStateMock } from '../license_state.mock';
import { createConnectorTypeFromSpec } from '../single_file_connectors/create_connector_from_spec';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import { loadFixture } from './__fixtures__/load_fixture';
import { materializeDeclarativeConnectorSpec } from './materialize_declarative_connector_spec';
import { parseDeclarativeConnectorSpec } from './parse_declarative_connector_spec';

describe('declarative connector registry', () => {
  it('registers the materialized spec and lists it as a spec source', () => {
    const licenseState = licenseStateMock.create();
    licenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    const configUtils = actionsConfigMock.create();
    const registry = new ActionTypeRegistry({
      licensing: licensingMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      taskRunnerFactory: { create: jest.fn() } as never,
      actionsConfigUtils: configUtils,
      licenseState,
      inMemoryConnectors: [],
    });
    const setup = {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn(),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn(),
    } as unknown as ActionsPluginSetupContract;
    const materialized = materializeDeclarativeConnectorSpec(
      parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'))
    );

    registry.register(createConnectorTypeFromSpec(materialized, setup));

    expect(registry.getSpec('.declarative-abuseipdb')).toBe(materialized);
    expect(registry.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.declarative-abuseipdb',
          source: ACTION_TYPE_SOURCES.spec,
          isTestable: true,
          name: 'AbuseIPDB (Declarative PoC)',
        }),
      ])
    );
  });
});
