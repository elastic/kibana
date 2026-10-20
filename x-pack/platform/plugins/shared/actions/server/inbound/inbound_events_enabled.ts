/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  connectorTypeHasInboundEvents,
  connectorTypeIsDual,
  connectorTypeIsInboundOnly,
} from '@kbn/connector-specs';
import { i18n } from '@kbn/i18n';

/**
 * Dual “on” follows last-saver identity. Inbound-only is always on.
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
}): boolean => {
  if (connectorTypeIsInboundOnly(actionTypeId)) {
    return true;
  }
  if (eventsEnabled) {
    return connectorTypeIsDual(actionTypeId);
  }
  return connectorTypeIsDual(actionTypeId) && hasIdentity;
};

export const shouldMintInboundIdentity = ({
  actionTypeId,
  isInboundEventsEnabled,
}: {
  actionTypeId: string;
  isInboundEventsEnabled: boolean;
}): boolean => {
  if (connectorTypeIsInboundOnly(actionTypeId)) {
    return true;
  }
  return connectorTypeIsDual(actionTypeId) && isInboundEventsEnabled;
};

/**
 * Rejects `is_inbound_events_enabled` on types that are not dual.
 * Inbound-only stays always-on by omitting the field.
 */
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
  if (connectorTypeIsDual(actionTypeId)) {
    return;
  }
  throw Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.inboundEventsToggleNotDual', {
      defaultMessage:
        'Inbound events can only be turned on for connectors that both send and receive.',
    })
  );
};

/**
 * Create: inbound-only is on. Dual omit = off. Dual true = on.
 */
export const resolveCreateInboundEventsEnabled = ({
  actionTypeId,
  requestedEnabled,
}: {
  actionTypeId: string;
  requestedEnabled: boolean | undefined;
}): boolean => {
  if (connectorTypeIsInboundOnly(actionTypeId)) {
    return true;
  }
  return connectorTypeIsDual(actionTypeId) && requestedEnabled === true;
};

/**
 * Update: inbound-only is on. Dual omit = keep previous. Dual explicit = that value.
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
  if (connectorTypeIsInboundOnly(actionTypeId)) {
    return true;
  }
  if (!connectorTypeIsDual(actionTypeId)) {
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
