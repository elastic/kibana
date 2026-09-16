/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { registerConnectorTypesFromSpecs } from '.';

describe('registerConnectorTypesFromSpecs', () => {
  const logger = loggerMock.create();

  const createActionsSetup = (inboundEventsEnabled: boolean) => {
    const actions = actionsMock.createSetup();
    const configUtils = actions.getActionsConfigurationUtilities();
    (configUtils.isInboundEventsEnabled as jest.Mock).mockReturnValue(inboundEventsEnabled);
    actions.getActionsConfigurationUtilities.mockReturnValue(configUtils);
    return actions;
  };

  const registeredTypes = (registerType: jest.Mock): Array<{ id: string; source?: string }> =>
    registerType.mock.calls.map(([actionType]: [{ id: string; source?: string }]) => actionType);

  const registeredIds = (registerType: jest.Mock): string[] =>
    registeredTypes(registerType).map(({ id }) => id);

  it('skips inbound-only specs when inbound events are disabled', () => {
    const actions = createActionsSetup(false);

    registerConnectorTypesFromSpecs({ actions, logger });

    const ids = registeredIds(actions.registerType as jest.Mock);
    expect(ids).not.toContain('.inboundWebhook');
    expect(ids).toHaveLength(Object.values(connectorsSpecs).length);
  });

  it('registers inbound-only specs when inbound events are enabled', () => {
    const actions = createActionsSetup(true);

    registerConnectorTypesFromSpecs({ actions, logger });

    const ids = registeredIds(actions.registerType as jest.Mock);
    expect(ids).toContain('.inboundWebhook');
    expect(ids).toHaveLength(Object.values(connectorsSpecs).length + 1);
  });

  it('registers the shipped declarative AbuseIPDB spec as a real spec type', () => {
    const actions = createActionsSetup(false);

    registerConnectorTypesFromSpecs({ actions, logger });

    const abuseipdb = registeredTypes(actions.registerType as jest.Mock).find(
      ({ id }) => id === '.abuseipdb'
    );
    expect(abuseipdb).toEqual(
      expect.objectContaining({
        id: '.abuseipdb',
        source: ACTION_TYPE_SOURCES.spec,
      })
    );
  });
});
