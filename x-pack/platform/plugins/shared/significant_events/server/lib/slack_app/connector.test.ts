/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  ELASTIC_APPS_SLACK_CONNECTOR_ID,
  ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID,
  getRegisteredTenantKey,
  registerElasticAppsSlackConnector,
  unregisterElasticAppsSlackConnector,
} from './connector';

const createLogger = () => ({ debug: jest.fn() } as unknown as jest.Mocked<Logger>);

const createActions = () => {
  const calls: string[] = [];
  return {
    calls,
    registerDynamicConnector: jest.fn(() => {
      calls.push('register');
      return true;
    }),
    unregisterDynamicConnector: jest.fn(() => {
      calls.push('unregister');
      return true;
    }),
  };
};

describe('registerElasticAppsSlackConnector', () => {
  it('registers a Slack (v2) connector authenticated through the Relay', () => {
    const actions = createActions();

    registerElasticAppsSlackConnector({
      actions,
      logger: createLogger(),
      tenantKey: 'tenant-A',
    });

    expect(actions.registerDynamicConnector).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ELASTIC_APPS_SLACK_CONNECTOR_ID,
        actionTypeId: '.slack2',
        config: { authType: 'relay' },
        secrets: { authType: 'relay', tenantKey: 'tenant-A' },
        isPreconfigured: true,
        isSystemAction: false,
        isMissingSecrets: false,
      })
    );
  });

  it('unregisters before registering so a new tenant key takes effect', () => {
    const actions = createActions();

    registerElasticAppsSlackConnector({
      actions,
      logger: createLogger(),
      tenantKey: 'tenant-A',
    });

    expect(actions.calls).toEqual(['unregister', 'register']);
  });
});

describe('unregisterElasticAppsSlackConnector', () => {
  it('unregisters by the well-known id', () => {
    const actions = createActions();

    unregisterElasticAppsSlackConnector({ actions, logger: createLogger() });

    expect(actions.unregisterDynamicConnector).toHaveBeenCalledWith(
      ELASTIC_APPS_SLACK_CONNECTOR_ID
    );
  });

  it('logs only when a connector was actually removed', () => {
    const logger = createLogger();
    const actions = { unregisterDynamicConnector: jest.fn().mockReturnValue(false) };

    unregisterElasticAppsSlackConnector({ actions, logger });

    expect(logger.debug).not.toHaveBeenCalled();
  });
});

describe('getRegisteredTenantKey', () => {
  it('returns the tenant key this process is serving', () => {
    expect(
      getRegisteredTenantKey({
        inMemoryConnectors: [
          { id: 'other', secrets: { tenantKey: 'tenant-Z' } },
          { id: ELASTIC_APPS_SLACK_CONNECTOR_ID, secrets: { tenantKey: 'tenant-A' } },
        ] as never,
      })
    ).toBe('tenant-A');
  });

  it('returns undefined when the connector is not registered', () => {
    expect(getRegisteredTenantKey({ inMemoryConnectors: [] })).toBeUndefined();
  });

  it('returns undefined when the registered connector carries no tenant key', () => {
    expect(
      getRegisteredTenantKey({
        inMemoryConnectors: [{ id: ELASTIC_APPS_SLACK_CONNECTOR_ID, secrets: {} }] as never,
      })
    ).toBeUndefined();
  });
});

describe('connector type', () => {
  it('is the Slack (v2) spec, not a connector type of its own', () => {
    expect(ELASTIC_APPS_SLACK_CONNECTOR_TYPE_ID).toBe('.slack2');
  });
});
