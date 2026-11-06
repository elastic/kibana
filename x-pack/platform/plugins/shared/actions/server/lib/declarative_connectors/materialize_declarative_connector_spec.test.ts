/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { actionsConfigMock } from '../../actions_config.mock';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import { validateConfig, validateParams, validateSecrets } from '../validate_with_schema';
import { createConnectorTypeFromSpec } from '../single_file_connectors/create_connector_from_spec';
import { loadFixture } from './__fixtures__/load_fixture';
import { materializeDeclarativeConnectorSpec } from './materialize_declarative_connector_spec';
import { parseDeclarativeConnectorSpec } from './parse_declarative_connector_spec';

const validatorServices = {
  configurationUtilities: actionsConfigMock.create(),
};

const createSetupMock = (): ActionsPluginSetupContract =>
  ({
    getActionsConfigurationUtilities: () => actionsConfigMock.create(),
    getAxiosInstanceWithAuth: jest.fn(),
    getCredential: jest.fn(),
    getClientLeasePool: jest.fn(),
  } as unknown as ActionsPluginSetupContract);

describe('materializeDeclarativeConnectorSpec', () => {
  const connector = parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'));
  const materialized = materializeDeclarativeConnectorSpec(connector);

  it('builds a ConnectorSpec from the catalog contract', () => {
    expect(materialized.metadata.id).toBe('.declarative-abuseipdb');
    expect(materialized.actions.checkIp.isTool).toBe(true);
    expect(materialized.actions.checkIp.scope).toBe('read');
    expect(materialized.actions.reportIp.scope).toBe('write');
    expect(materialized.test.enabled).toBe(true);
  });

  it('defaults DELETE actions to the destroy scope', () => {
    const deleteSpec = materializeDeclarativeConnectorSpec({
      ...connector,
      actions: {
        remove: {
          ...connector.actions.checkIp,
          scope: undefined,
          request: { ...connector.actions.checkIp.request, method: 'DELETE' },
        },
      },
    });
    expect(deleteSpec.actions.remove.scope).toBe('destroy');
  });

  it('registers through createConnectorTypeFromSpec and validates config, params, and secrets', () => {
    const actionType = createConnectorTypeFromSpec(materialized, createSetupMock());

    expect(actionType.id).toBe('.declarative-abuseipdb');
    expect(actionType.isTestable).toBe(true);
    expect(actionType.source).toBe(ACTION_TYPE_SOURCES.spec);

    expect(() =>
      validateConfig(actionType, { baseUrl: 'https://api.abuseipdb.com' }, validatorServices)
    ).not.toThrow();
    expect(() =>
      validateParams(
        actionType,
        { subAction: 'checkIp', subActionParams: { ipAddress: '1.2.3.4' } },
        validatorServices
      )
    ).not.toThrow();
    expect(() =>
      validateSecrets(actionType, { authType: 'api_key_header', Key: 'secret' }, validatorServices)
    ).not.toThrow();
  });

  it('rejects a config URL that is not in allowed hosts', () => {
    const configUtils = actionsConfigMock.create();
    configUtils.ensureUriAllowed.mockImplementation((uri: string) => {
      throw new Error(
        `target url "${uri}" is not added to the Kibana config xpack.actions.allowedHosts`
      );
    });
    const actionType = createConnectorTypeFromSpec(materialized, {
      getActionsConfigurationUtilities: () => configUtils,
      getAxiosInstanceWithAuth: jest.fn(),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn(),
    } as unknown as ActionsPluginSetupContract);

    expect(() =>
      validateConfig(
        actionType,
        { baseUrl: 'https://evil.example' },
        { configurationUtilities: configUtils }
      )
    ).toThrow(/allowedHosts/);
  });

  it('accepts a config URL when allowed hosts does not throw', () => {
    const configUtils = actionsConfigMock.create();
    const actionType = createConnectorTypeFromSpec(materialized, createSetupMock());

    expect(() =>
      validateConfig(
        actionType,
        { baseUrl: 'https://api.abuseipdb.com' },
        { configurationUtilities: configUtils }
      )
    ).not.toThrow();
  });
});
