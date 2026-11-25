/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorTypeIsDual } from '@kbn/connector-specs';

/** Dual create/update send the flag only when the cluster switch is on. Otherwise the key is unknown and the route returns 400. */
export const isOutboundActionsEnabledPayload = (
  actionTypeId: string,
  isOutboundActionsEnabled: boolean | undefined,
  isClusterInboundEventsEnabled: boolean
): { isOutboundActionsEnabled?: boolean } => {
  if (isClusterInboundEventsEnabled && connectorTypeIsDual(actionTypeId)) {
    return { isOutboundActionsEnabled: isOutboundActionsEnabled !== false };
  }
  return {};
};

/**
 * Config and secrets to send on save.
 * With outbound off the spec fields are not part of the form. Edit sends the saved config so
 * `selectedActions`, `authType` and spec fields survive the off period, and no secrets.
 */
export const getOutboundSubmitValues = ({
  isOutboundActionsEnabled,
  formConfig,
  formSecrets,
  savedConfig,
}: {
  isOutboundActionsEnabled: boolean | undefined;
  formConfig: Record<string, unknown> | undefined;
  formSecrets: Record<string, unknown> | undefined;
  savedConfig?: Record<string, unknown>;
}): { config: Record<string, unknown>; secrets: Record<string, unknown> } => {
  if (isOutboundActionsEnabled === false) {
    return { config: savedConfig ?? {}, secrets: {} };
  }
  return { config: formConfig ?? {}, secrets: formSecrets ?? {} };
};
