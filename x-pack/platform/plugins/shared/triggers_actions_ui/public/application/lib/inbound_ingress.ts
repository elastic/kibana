/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorTypeHasInboundEvents, connectorTypeIsInboundOnly } from '@kbn/connector-specs';
import type { ActionConnector } from '../../types';

/**
 * Prefer the flag copied from the actions setup contract onto connector services.
 * Embedded hosts such as Workflows have no actions start contract, so reading
 * `services.actions` there is always false.
 */
export const readClusterInboundEventsEnabled = (
  services: {
    actions?: { isInboundEventsEnabled?: boolean };
  },
  connectorServices?: { isInboundEventsEnabled?: boolean }
): boolean => {
  if (typeof connectorServices?.isInboundEventsEnabled === 'boolean') {
    return connectorServices.isInboundEventsEnabled;
  }
  return services.actions?.isInboundEventsEnabled === true;
};

export const getInboundIngestToken = (connector: ActionConnector): string | undefined => {
  if (!('secrets' in connector) || connector.secrets == null) {
    return undefined;
  }
  const secrets = connector.secrets as { ingestToken?: unknown };
  const token = secrets.ingestToken;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
};

export const isInboundIngressConnector = (connector: ActionConnector): boolean =>
  connectorTypeHasInboundEvents(connector.actionTypeId);

/** Create/update send the flag only when the cluster switch is on. Otherwise the key is unknown and the route returns 400. */
export const isInboundEventsEnabledPayload = (
  actionTypeId: string,
  isInboundEventsEnabled: boolean | undefined,
  isClusterInboundEventsEnabled: boolean
): { isInboundEventsEnabled?: boolean } => {
  if (isClusterInboundEventsEnabled && connectorTypeHasInboundEvents(actionTypeId)) {
    return { isInboundEventsEnabled: isInboundEventsEnabled === true };
  }
  return {};
};

/** Create stays open and rotates when inbound events are enabled for the cluster and turned on for the connector. */
export const shouldRotateInboundAfterSave = (
  connector: Pick<ActionConnector, 'actionTypeId'> & { isInboundEventsEnabled?: boolean },
  isClusterInboundEventsEnabled: boolean
): boolean => {
  if (!isClusterInboundEventsEnabled) {
    return false;
  }
  return (
    connectorTypeHasInboundEvents(connector.actionTypeId) &&
    connector.isInboundEventsEnabled === true
  );
};

/** Default for the Receive events switch: on for types that only receive, off for dual types. */
export const getDefaultInboundEventsEnabled = (
  actionTypeId: string
): { isInboundEventsEnabled?: boolean } =>
  connectorTypeHasInboundEvents(actionTypeId)
    ? { isInboundEventsEnabled: connectorTypeIsInboundOnly(actionTypeId) }
    : {};
