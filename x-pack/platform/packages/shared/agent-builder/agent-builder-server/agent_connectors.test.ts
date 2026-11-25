/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentConnectorDetail, listAgentConnectors } from './agent_connectors';

describe('agent connectors', () => {
  const buildClient = (
    connectors: Array<{
      id: string;
      name: string;
      actionTypeId: string;
      config?: Record<string, unknown>;
      isOutboundActionsEnabled?: boolean;
    }>
  ) => ({
    getAll: jest.fn().mockResolvedValue(connectors),
    get: jest
      .fn()
      .mockImplementation(async ({ id }: { id: string }) => connectors.find((c) => c.id === id)),
  });

  const onConnector = { id: 'on', name: 'Slack on', actionTypeId: '.slack2', config: {} };
  const offConnector = {
    id: 'off',
    name: 'Slack off',
    actionTypeId: '.slack2',
    config: { outboundEnabled: false },
    isOutboundActionsEnabled: false,
  };

  describe('listAgentConnectors', () => {
    it('lists a connector with outbound on', async () => {
      const result = await listAgentConnectors(buildClient([onConnector]), {});

      expect(result.map(({ id }) => id)).toEqual(['on']);
    });

    it('does not list a connector with outbound off', async () => {
      const result = await listAgentConnectors(buildClient([onConnector, offConnector]), {});

      expect(result.map(({ id }) => id)).toEqual(['on']);
    });

    it('does not list a connector with outbound off in the config only', async () => {
      const { isOutboundActionsEnabled: _omit, ...configOnly } = offConnector;

      const result = await listAgentConnectors(buildClient([configOnly]), {});

      expect(result).toEqual([]);
    });
  });

  describe('getAgentConnectorDetail', () => {
    it('lists the tool sub-actions of a connector with outbound on', async () => {
      const result = await getAgentConnectorDetail(buildClient([onConnector]), 'on');

      expect(result?.subActions.length).toBeGreaterThan(0);
    });

    it('respects the saved action selection when outbound is on', async () => {
      const connector = { ...onConnector, config: { selectedActions: ['searchMessages'] } };

      const result = await getAgentConnectorDetail(buildClient([connector]), 'on');

      expect(result?.subActions.map(({ name }) => name)).toEqual(['searchMessages']);
    });

    it('lists no sub-actions for a connector with outbound off', async () => {
      const result = await getAgentConnectorDetail(buildClient([offConnector]), 'off');

      expect(result).toEqual(expect.objectContaining({ id: 'off', subActions: [] }));
    });

    it('lists no sub-actions when outbound is off in the config only', async () => {
      const { isOutboundActionsEnabled: _omit, ...configOnly } = offConnector;

      const result = await getAgentConnectorDetail(buildClient([configOnly]), 'off');

      expect(result?.subActions).toEqual([]);
    });
  });
});
