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

export const hasInboundEventIdentityAttributes = (attributes: {
  apiKey?: string | null;
  uiamApiKey?: string | null;
}): boolean => Boolean(attributes.apiKey || attributes.uiamApiKey);

/**
 * Dual “on” follows last-saver identity. Inbound-only is always on.
 * The ingest credential is minted later by rotate, not by enable.
 */
export const resolveInboundEventsEnabled = ({
  actionTypeId,
  hasIdentity,
}: {
  actionTypeId: string;
  hasIdentity: boolean;
}): boolean => {
  if (connectorTypeIsInboundOnly(actionTypeId)) {
    return true;
  }
  return connectorTypeIsDual(actionTypeId) && hasIdentity;
};

export const shouldMintInboundIdentity = ({
  actionTypeId,
  inboundEventsEnabled,
}: {
  actionTypeId: string;
  inboundEventsEnabled: boolean;
}): boolean => {
  if (connectorTypeIsInboundOnly(actionTypeId)) {
    return true;
  }
  return connectorTypeIsDual(actionTypeId) && inboundEventsEnabled;
};

/**
 * Rejects `inbound_events_enabled` on types that are not dual.
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

export const attachInboundEventsEnabled = <T extends { id: string; actionTypeId: string }>({
  connectors,
  connectorIdsWithIdentity,
}: {
  connectors: T[];
  connectorIdsWithIdentity: ReadonlySet<string>;
}): T[] =>
  connectors.map((connector) => {
    if (!connectorTypeHasInboundEvents(connector.actionTypeId)) {
      return connector;
    }
    return {
      ...connector,
      inboundEventsEnabled: resolveInboundEventsEnabled({
        actionTypeId: connector.actionTypeId,
        hasIdentity: connectorIdsWithIdentity.has(connector.id),
      }),
    };
  });

export const readInboundEventsEnabled = ({
  actionTypeId,
  hasIdentity,
}: {
  actionTypeId: string;
  hasIdentity: boolean;
}): boolean | undefined => {
  if (!connectorTypeHasInboundEvents(actionTypeId)) {
    return undefined;
  }
  return resolveInboundEventsEnabled({ actionTypeId, hasIdentity });
};
