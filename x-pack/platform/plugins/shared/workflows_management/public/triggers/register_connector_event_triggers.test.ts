/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  connectorEventPlugsIcon,
  registerConnectorEventTriggersPublic,
} from './register_connector_event_triggers';
import { getConnectorTypeIdForTriggerEventId } from '../../common/triggers/connector_event_triggers';

describe('registerConnectorEventTriggersPublic', () => {
  it('does not register inboundWebhook.received when inbound events are disabled', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggersPublic({
      inboundEventsEnabled: false,
      registerTriggerDefinition,
    });

    expect(registerTriggerDefinition).not.toHaveBeenCalled();
  });

  it('registers inboundWebhook.received when inbound events are enabled', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggersPublic({
      inboundEventsEnabled: true,
      registerTriggerDefinition,
    });

    const registered = registerTriggerDefinition.mock.calls.map(
      ([definition]: [PublicTriggerDefinition]) => definition.id
    );
    expect(registered).toContain('inboundWebhook.received');
    expect(registerTriggerDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inboundWebhook.received',
        stability: 'tech_preview',
        requiresConnectorId: true,
        icon: connectorEventPlugsIcon,
      })
    );
  });

  it('uses each connector icon for the event triggers registered from that connector', () => {
    const registerTriggerDefinition = jest.fn();

    registerConnectorEventTriggersPublic({
      inboundEventsEnabled: true,
      registerTriggerDefinition,
    });

    const definitions = registerTriggerDefinition.mock.calls.map(
      ([definition]: [PublicTriggerDefinition]) => definition
    );

    expect(definitions.map((definition) => definition.id)).toContain('inboundWebhook.received');
    for (const definition of definitions) {
      const connectorTypeId = getConnectorTypeIdForTriggerEventId(definition.id);
      const brandIcon = connectorTypeId ? ConnectorIconsMap.get(connectorTypeId) : undefined;
      expect(definition.icon).toBe(brandIcon ?? connectorEventPlugsIcon);
    }
  });
});
