/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { connectorTypeHasInboundEvents, connectorTypeIsInboundOnly } from '@kbn/connector-specs';
import { i18n } from '@kbn/i18n';

/**
 * Events are on while the connector holds the last saver's identity, or when an in-memory
 * connector turns them on. Applies to every type with inbound events, dual or inbound-only.
 * The ingest credential is minted later by rotate, not by enable.
 */
export const resolveInboundEventsEnabled = ({
  actionTypeId,
  hasIdentity,
  eventsEnabled = false,
}: {
  actionTypeId: string;
  hasIdentity: boolean;
  /** In-memory connector has events on, with no saved-object identity. */
  eventsEnabled?: boolean;
}): boolean => connectorTypeHasInboundEvents(actionTypeId) && (eventsEnabled || hasIdentity);

export const shouldMintInboundIdentity = ({
  actionTypeId,
  isInboundEventsEnabled,
}: {
  actionTypeId: string;
  isInboundEventsEnabled: boolean;
}): boolean => connectorTypeHasInboundEvents(actionTypeId) && isInboundEventsEnabled;

/** Rejects `is_inbound_events_enabled` on types without inbound events. */
export const assertInboundEventsToggleAllowed = ({
  actionTypeId,
  requestedEnabled,
}: {
  actionTypeId: string;
  requestedEnabled: boolean | undefined;
}): void => {
  if (requestedEnabled === undefined) {
    return;
  }
  if (connectorTypeHasInboundEvents(actionTypeId)) {
    return;
  }
  throw Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.inboundEventsToggleNotSupported', {
      defaultMessage: 'Inbound events can only be turned on for connectors that receive events.',
    })
  );
};

/**
 * Create: inbound-only omit = on, so receiving is what it does by default. Dual omit = off.
 * An explicit value wins for both.
 */
export const resolveCreateInboundEventsEnabled = ({
  actionTypeId,
  requestedEnabled,
}: {
  actionTypeId: string;
  requestedEnabled: boolean | undefined;
}): boolean => {
  if (!connectorTypeHasInboundEvents(actionTypeId)) {
    return false;
  }
  if (requestedEnabled !== undefined) {
    return requestedEnabled;
  }
  return connectorTypeIsInboundOnly(actionTypeId);
};

/**
 * Update: omit = keep previous. Explicit = that value. Applies to dual and inbound-only.
 */
export const resolveUpdateInboundEventsEnabled = ({
  actionTypeId,
  requestedEnabled,
  previouslyEnabled,
}: {
  actionTypeId: string;
  requestedEnabled: boolean | undefined;
  previouslyEnabled: boolean;
}): boolean => {
  if (!connectorTypeHasInboundEvents(actionTypeId)) {
    return false;
  }
  return requestedEnabled === undefined ? previouslyEnabled : requestedEnabled;
};

export const attachInboundEventsEnabled = <
  T extends { id: string; actionTypeId: string; isPreconfigured?: boolean }
>({
  connectors,
  connectorIdsWithIdentity,
  connectorIdsWithEventsEnabled = new Set<string>(),
}: {
  connectors: T[];
  connectorIdsWithIdentity: ReadonlySet<string>;
  connectorIdsWithEventsEnabled?: ReadonlySet<string>;
}): T[] =>
  connectors.map((connector) => {
    if (!connectorTypeHasInboundEvents(connector.actionTypeId)) {
      return connector;
    }
    // A shared id must not copy a preconfigured registration onto a saved row, or a saved identity onto a preconfigured row.
    const isPreconfigured = connector.isPreconfigured === true;
    return {
      ...connector,
      isInboundEventsEnabled: resolveInboundEventsEnabled({
        actionTypeId: connector.actionTypeId,
        hasIdentity: !isPreconfigured && connectorIdsWithIdentity.has(connector.id),
        eventsEnabled: isPreconfigured && connectorIdsWithEventsEnabled.has(connector.id),
      }),
    };
  });

export const readInboundEventsEnabled = ({
  actionTypeId,
  hasIdentity,
  eventsEnabled = false,
}: {
  actionTypeId: string;
  hasIdentity: boolean;
  eventsEnabled?: boolean;
}): boolean | undefined => {
  if (!connectorTypeHasInboundEvents(actionTypeId)) {
    return undefined;
  }
  return resolveInboundEventsEnabled({ actionTypeId, hasIdentity, eventsEnabled });
};
