/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server';
import { toConnectorItem } from './utils';

const buildConnector = (overrides: Partial<Connector> = {}): Connector => ({
  id: 'conn-1',
  name: 'Slack',
  actionTypeId: '.slack2',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isMissingSecrets: false,
  isConnectorTypeDeprecated: false,
  config: {},
  ...overrides,
});

describe('toConnectorItem', () => {
  it('lists the sub-actions of a connector with outbound on', () => {
    const item = toConnectorItem(buildConnector());

    expect(item.subActions.length).toBeGreaterThan(0);
  });

  it('keeps the saved selection when outbound is on', () => {
    const item = toConnectorItem(
      buildConnector({ config: { selectedActions: ['searchMessages'] } })
    );

    expect(item.subActions.map(({ name }) => name)).toEqual(['searchMessages']);
  });

  it('has no sub-actions when outbound is off', () => {
    const item = toConnectorItem(
      buildConnector({
        config: { outboundEnabled: false, selectedActions: ['searchMessages'] },
        isOutboundActionsEnabled: false,
      })
    );

    expect(item.subActions).toEqual([]);
  });

  it('has no sub-actions when outbound is off in the config only', () => {
    const item = toConnectorItem(buildConnector({ config: { outboundEnabled: false } }));

    expect(item.subActions).toEqual([]);
  });
});
