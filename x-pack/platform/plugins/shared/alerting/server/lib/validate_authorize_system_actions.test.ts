/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock, actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { schema } from '@kbn/config-schema';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { ConnectorAdapter } from '../connector_adapters/types';
import { NormalizedSystemAction } from '../rules_client';
import { RuleSystemAction } from '../types';
import { validateAndAuthorizeSystemActions } from './validate_authorize_system_actions';

describe('validateAndAuthorizeSystemActions', () => {
  const connectorAdapter: ConnectorAdapter = {
    connectorTypeId: '.test',
    ruleActionParamsSchema: schema.object({ foo: schema.string() }),
    buildActionParams: jest.fn(),
  };

  let registry: ConnectorAdapterRegistry;
  let actionsClient: jest.Mocked<ActionsClient>;
  let actionsAuthorization: jest.Mocked<ActionsAuthorization>;

  beforeEach(() => {
    registry = new ConnectorAdapterRegistry();
    actionsClient = actionsClientMock.create();
    actionsAuthorization = actionsAuthorizationMock.create();

    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'system_action-id',
        actionTypeId: '.test',
        config: {},
        isMissingSecrets: false,
        name: 'system action connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);
  });

  it('should not validate with empty system actions', async () => {
    const res = await validateAndAuthorizeSystemActions({
      connectorAdapterRegistry: registry,
      systemActions: [],
      actionsClient,
      actionsAuthorization,
      rule: { consumer: 'stackAlerts', producer: 'alerts' },
    });

    expect(res).toBe(undefined);
    expect(actionsClient.getBulk).not.toBeCalled();
    expect(actionsClient.isSystemAction).not.toBeCalled();
  });

  it('should throw an error if the action is not a system action even if it is declared as one', async () => {
    const systemActions: RuleSystemAction[] = [
      {
        id: 'not-exist',
        uuid: '123',
        params: { foo: 'test' },
        actionTypeId: '.test',
      },
    ];

    registry.register(connectorAdapter);

    actionsClient.isSystemAction.mockReturnValue(false);

    await expect(() =>
      validateAndAuthorizeSystemActions({
        connectorAdapterRegistry: registry,
        systemActions,
        actionsClient,
        actionsAuthorization,
        rule: { consumer: 'stackAlerts', producer: 'alerts' },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Action not-exist is not a system action"`);
  });

  it('should throw an error if the action is system action but is not returned from the actions client (getBulk)', async () => {
    const systemActions: RuleSystemAction[] = [
      {
        id: 'not-exist',
        uuid: '123',
        params: { foo: 'test' },
        actionTypeId: '.test',
      },
    ];

    registry.register(connectorAdapter);

    actionsClient.isSystemAction.mockReturnValue(true);

    await expect(() =>
      validateAndAuthorizeSystemActions({
        connectorAdapterRegistry: registry,
        systemActions,
        actionsClient,
        actionsAuthorization,
        rule: { consumer: 'stackAlerts', producer: 'alerts' },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Action not-exist is not a system action"`);
  });

  it('should throw an error if the params are not valid', async () => {
    const systemActions: RuleSystemAction[] = [
      {
        id: 'system_action-id',
        uuid: '123',
        params: { 'not-exist': 'test' },
        actionTypeId: '.test',
      },
    ];

    registry.register(connectorAdapter);

    actionsClient.isSystemAction.mockReturnValue(true);

    await expect(() =>
      validateAndAuthorizeSystemActions({
        connectorAdapterRegistry: registry,
        systemActions,
        actionsClient,
        actionsAuthorization,
        rule: { consumer: 'stackAlerts', producer: 'alerts' },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid system action params. System action type: .test - [foo]: expected value of type [string] but got [undefined]"`
    );
  });

  it('should throw an error if the same system action is being used', async () => {
    const systemActions: RuleSystemAction[] = [
      {
        id: 'system_action-id',
        uuid: '123',
        params: { foo: 'test' },
        actionTypeId: '.test',
      },
      {
        id: 'system_action-id',
        uuid: '123',
        params: { foo: 'test' },
        actionTypeId: '.test',
      },
    ];

    registry.register(connectorAdapter);

    actionsClient.isSystemAction.mockReturnValue(false);

    await expect(() =>
      validateAndAuthorizeSystemActions({
        connectorAdapterRegistry: registry,
        systemActions,
        actionsClient,
        actionsAuthorization,
        rule: { consumer: 'stackAlerts', producer: 'alerts' },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Cannot use the same system action twice"`);
  });

  it('should call getBulk correctly', async () => {
    const systemActions: Array<RuleSystemAction | NormalizedSystemAction> = [
      {
        id: 'system_action-id',
        uuid: '123',
        params: { foo: 'test' },
      },
      {
        id: 'system_action-id-2',
        uuid: '123',
        params: { foo: 'test' },
        actionTypeId: '.test',
      },
    ];

    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'system_action-id',
        actionTypeId: '.test',
        config: {},
        isMissingSecrets: false,
        name: 'system action connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
      {
        id: 'system_action-id-2',
        actionTypeId: '.test',
        config: {},
        isMissingSecrets: false,
        name: 'system action connector 2',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);

    registry.register(connectorAdapter);

    actionsClient.isSystemAction.mockReturnValue(true);

    const res = await validateAndAuthorizeSystemActions({
      connectorAdapterRegistry: registry,
      systemActions,
      actionsClient,
      actionsAuthorization,
      rule: { consumer: 'stackAlerts', producer: 'alerts' },
    });

    expect(res).toBe(undefined);

    expect(actionsClient.getBulk).toBeCalledWith({
      ids: ['system_action-id', 'system_action-id-2'],
      throwIfSystemAction: false,
    });

    expect(actionsAuthorization.ensureAuthorized).toBeCalledWith({
      operation: 'execute',
      additionalPrivileges: [],
    });
  });

  it('should call ensureAuthorized correctly', async () => {
    const systemActions: Array<RuleSystemAction | NormalizedSystemAction> = [
      {
        id: 'system_action-id',
        uuid: '123',
        params: { foo: 'test' },
      },
      {
        id: 'system_action-id-2',
        uuid: '123',
        params: { foo: 'test' },
        actionTypeId: '.test-2',
      },
    ];

    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'system_action-id',
        actionTypeId: '.test',
        config: {},
        isMissingSecrets: false,
        name: 'system action connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
      {
        id: 'system_action-id-2',
        actionTypeId: '.test-2',
        config: {},
        isMissingSecrets: false,
        name: 'system action connector 2',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);

    registry.register(connectorAdapter);
    registry.register({
      ...connectorAdapter,
      connectorTypeId: '.test-2',
      getKibanaPrivileges: (args) => [`my-priv-2:${args.consumer}`],
    });

    actionsClient.isSystemAction.mockReturnValue(true);

    await validateAndAuthorizeSystemActions({
      connectorAdapterRegistry: registry,
      systemActions,
      actionsClient,
      actionsAuthorization,
      rule: { consumer: 'stackAlerts', producer: 'alerts' },
    });

    expect(actionsAuthorization.ensureAuthorized).toBeCalledWith({
      operation: 'execute',
      additionalPrivileges: ['my-priv-2:stackAlerts'],
    });
  });
});
