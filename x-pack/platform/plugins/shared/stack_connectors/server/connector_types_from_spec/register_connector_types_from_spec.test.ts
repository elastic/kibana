/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs, isInboundOnlyConnectorSpec } from '@kbn/connector-specs';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { registerConnectorTypesFromSpecs } from '.';

describe('registerConnectorTypesFromSpecs', () => {
  const createActionsSetup = (inboundEventsEnabled: boolean) => {
    const actions = actionsMock.createSetup();
    const configUtils = actions.getActionsConfigurationUtilities();
    (configUtils.isInboundEventsEnabled as jest.Mock).mockReturnValue(inboundEventsEnabled);
    actions.getActionsConfigurationUtilities.mockReturnValue(configUtils);
    return actions;
  };

  const registeredIds = (registerType: jest.Mock): string[] =>
    registerType.mock.calls.map(([actionType]: [{ id: string }]) => actionType.id);

  it('skips inbound-only specs when inbound events are disabled', () => {
    const actions = createActionsSetup(false);

    registerConnectorTypesFromSpecs({ actions });

    const ids = registeredIds(actions.registerType as jest.Mock);
    expect(ids).not.toContain('.inboundWebhook');
    expect(ids).not.toContain('.abuseipdb');
    expect(ids).not.toContain('.okta');
    expect(ids).toHaveLength(
      Object.values(connectorsSpecs).filter((spec) => !isInboundOnlyConnectorSpec(spec)).length
    );
  });

  it('registers inbound-only specs when inbound events are enabled', () => {
    const actions = createActionsSetup(true);

    registerConnectorTypesFromSpecs({ actions });

    const ids = registeredIds(actions.registerType as jest.Mock);
    expect(ids).toContain('.inboundWebhook');
    expect(ids).not.toContain('.abuseipdb');
    expect(ids).not.toContain('.okta');
    expect(ids).toHaveLength(Object.values(connectorsSpecs).length);
  });
});
