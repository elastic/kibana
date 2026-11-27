/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecSummary } from '@kbn/actions-plugin/common';
import { getAvailableConnectors } from './workflow_connectors';

const mockSpecSummary = (overrides: Partial<ConnectorSpecSummary> = {}): ConnectorSpecSummary =>
  ({
    id: '.spec_connector',
    displayName: 'Spec connector',
    description: '',
    actions: [],
    hasInboundEvents: false,
    ...overrides,
  } as ConnectorSpecSummary);

const mockActionType = (overrides: Record<string, unknown> = {}) => ({
  id: '.slack',
  name: 'Slack',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  ...overrides,
});

const mockConnector = (overrides: Record<string, unknown> = {}) => ({
  id: 'slack-1',
  name: 'Primary Slack',
  actionTypeId: '.slack',
  isPreconfigured: false,
  isDeprecated: false,
  config: {},
  ...overrides,
});

describe('getAvailableConnectors', () => {
  const request = {} as any;

  it('groups connectors by type and returns the configured action-type metadata', async () => {
    const actionsClient = { getAll: jest.fn().mockResolvedValue([mockConnector()]) };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.totalConnectors).toBe(1);
    expect(result.connectorTypes['.slack']).toMatchObject({
      actionTypeId: '.slack',
      displayName: 'Slack',
      enabled: true,
      instances: [{ id: 'slack-1', name: 'Primary Slack', isPreconfigured: false }],
    });
  });

  it('includes action types that have no connector instances with an empty instances array', async () => {
    const actionsClient = { getAll: jest.fn().mockResolvedValue([]) };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType({ id: '.email', name: 'Email' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.email'].instances).toEqual([]);
    expect(result.totalConnectors).toBe(0);
  });

  it('drops connectors whose actionTypeId is not in the allowed action-types list', async () => {
    const actionsClient = {
      getAll: jest
        .fn()
        .mockResolvedValue([
          mockConnector(),
          mockConnector({ id: 'legacy-1', actionTypeId: '.legacy' }),
        ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(Object.keys(result.connectorTypes)).toEqual(['.slack']);
    expect(result.connectorTypes['.slack'].instances).toHaveLength(1);
    // `totalConnectors` still reflects the raw connector count, even those we filter out — the
    // facade previously asserted this; preserving here as regression guard.
    expect(result.totalConnectors).toBe(2);
  });

  it('groups multiple instances of the same type together', async () => {
    const actionsClient = {
      getAll: jest
        .fn()
        .mockResolvedValue([mockConnector(), mockConnector({ id: 'slack-2', name: 'Secondary' })]),
    };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType()]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.slack'].instances.map((i) => i.id)).toEqual([
      'slack-1',
      'slack-2',
    ]);
  });

  it('surfaces inference taskType config in the instance payload', async () => {
    const actionsClient = {
      getAll: jest.fn().mockResolvedValue([
        mockConnector({
          id: 'inf-1',
          name: 'Inference',
          actionTypeId: '.inference',
          config: { taskType: 'text_classification' },
        }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([mockActionType({ id: '.inference', name: 'Inference' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.inference'].instances[0]).toMatchObject({
      id: 'inf-1',
      config: { taskType: 'text_classification' },
    });
  });

  it('surfaces selectedActions config for any connector that has it', async () => {
    const actionsClient = {
      getAll: jest.fn().mockResolvedValue([
        mockConnector({
          id: 'pd-1',
          name: 'PagerDuty',
          actionTypeId: '.pagerduty_mcp',
          config: { selectedActions: ['listIncidents', 'getIncident'] },
        }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([mockActionType({ id: '.pagerduty_mcp', name: 'PagerDuty MCP' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.pagerduty_mcp'].instances[0]).toMatchObject({
      id: 'pd-1',
      config: { selectedActions: ['listIncidents', 'getIncident'] },
    });
  });

  it('omits config entirely for connectors with no taskType or selectedActions', async () => {
    const actionsClient = {
      getAll: jest
        .fn()
        .mockResolvedValue([mockConnector({ id: 'slack-1', actionTypeId: '.slack', config: {} })]),
    };
    const actionsClientWithRequest = {
      listTypes: jest.fn().mockResolvedValue([mockActionType({ id: '.slack', name: 'Slack' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.slack'].instances[0].config).toBeUndefined();
  });

  it('surfaces both taskType and selectedActions for an inference connector that has both', async () => {
    const actionsClient = {
      getAll: jest.fn().mockResolvedValue([
        mockConnector({
          id: 'inf-2',
          actionTypeId: '.inference',
          config: { taskType: 'completion', selectedActions: ['chat'] },
        }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([mockActionType({ id: '.inference', name: 'Inference' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.inference'].instances[0]).toMatchObject({
      id: 'inf-2',
      config: { taskType: 'completion', selectedActions: ['chat'] },
    });
  });

  it('includes inbound webhook types omitted from the workflows feature list', async () => {
    const inboundType = mockActionType({
      id: '.inboundWebhook',
      name: 'Inbound Webhook',
      minimumLicenseRequired: 'gold',
    });
    const actionsClient = {
      getAll: jest.fn().mockResolvedValue([
        mockConnector({
          id: 'testyng',
          name: 'testyng',
          actionTypeId: '.inboundWebhook',
        }),
      ]),
    };
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValueOnce([mockActionType()])
        .mockResolvedValueOnce([mockActionType(), inboundType]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [
        mockSpecSummary({ id: '.inboundWebhook', hasInboundEvents: true }),
      ],
      spaceId: 'default',
      request,
    });

    expect(actionsClientWithRequest.listTypes).toHaveBeenCalledTimes(2);
    expect(result.connectorTypes['.inboundWebhook']).toMatchObject({
      actionTypeId: '.inboundWebhook',
      displayName: 'Inbound Webhook',
      instances: [{ id: 'testyng', name: 'testyng', isPreconfigured: false }],
    });
  });

  it('returns an empty payload when there are neither connectors nor action types', async () => {
    const actionsClient = { getAll: jest.fn().mockResolvedValue([]) };
    const actionsClientWithRequest = { listTypes: jest.fn().mockResolvedValue([]) };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue(actionsClient),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result).toEqual({ connectorTypes: {}, totalConnectors: 0 });
  });

  it('fires getAll and listTypes in parallel (both started before either resolves)', async () => {
    const order: string[] = [];
    const getAll = jest.fn().mockImplementation(async () => {
      order.push('getAll:start');
      await Promise.resolve();
      order.push('getAll:end');
      return [];
    });
    const listTypes = jest.fn().mockImplementation(async () => {
      order.push('listTypes:start');
      await Promise.resolve();
      order.push('listTypes:end');
      return [];
    });

    await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue({ getAll }),
      getActionsClientWithRequest: jest.fn().mockResolvedValue({ listTypes }),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    // Both starts precede both ends — proves parallel, not sequential.
    expect(order.indexOf('getAll:start')).toBeLessThan(order.indexOf('listTypes:end'));
    expect(order.indexOf('listTypes:start')).toBeLessThan(order.indexOf('getAll:end'));
  });

  it('takes the sub-actions of a spec-backed type from its spec summary', async () => {
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([mockActionType({ id: '.catalog_only', name: 'Catalog only' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue({ getAll: jest.fn().mockResolvedValue([]) }),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [
        mockSpecSummary({
          id: '.catalog_only',
          actions: [
            { name: 'list_items', isTool: true, scope: 'read' },
            { name: 'createItem', isTool: false, scope: 'write' },
          ],
        }),
      ],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.catalog_only'].subActions).toEqual([
      { name: 'list_items', displayName: 'List Items' },
      { name: 'createItem', displayName: 'Create Item' },
    ]);
  });

  it('flags a type whose spec only receives inbound events', async () => {
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([
          mockActionType({ id: '.inbound_only', name: 'Inbound only' }),
          mockActionType({ id: '.dual', name: 'Dual' }),
        ]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue({ getAll: jest.fn().mockResolvedValue([]) }),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [
        mockSpecSummary({ id: '.inbound_only', hasInboundEvents: true, isInboundOnly: true }),
        mockSpecSummary({ id: '.dual', hasInboundEvents: true, isInboundOnly: false }),
      ],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.inbound_only'].isInboundOnly).toBe(true);
    expect(result.connectorTypes['.dual'].isInboundOnly).toBeUndefined();
  });

  it('keeps the built-in sub-actions of a type that has no spec', async () => {
    const actionsClientWithRequest = {
      listTypes: jest
        .fn()
        .mockResolvedValue([mockActionType({ id: '.swimlane', name: 'Swimlane' })]),
    };

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue({ getAll: jest.fn().mockResolvedValue([]) }),
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest),
      getConnectorSpecSummaries: () => [],
      spaceId: 'default',
      request,
    });

    expect(result.connectorTypes['.swimlane'].subActions).toEqual([
      { name: 'pushToService', displayName: 'Push To Service' },
    ]);
  });

  it('lists a spec type with inbound events that is outside the workflows feature', async () => {
    const listTypes = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockActionType({ id: '.events_only', name: 'Events only' })]);

    const result = await getAvailableConnectors({
      getActionsClient: jest.fn().mockResolvedValue({ getAll: jest.fn().mockResolvedValue([]) }),
      getActionsClientWithRequest: jest.fn().mockResolvedValue({ listTypes }),
      getConnectorSpecSummaries: () => [
        mockSpecSummary({ id: '.events_only', hasInboundEvents: true }),
      ],
      spaceId: 'default',
      request,
    });

    expect(Object.keys(result.connectorTypes)).toEqual(['.events_only']);
  });
});
