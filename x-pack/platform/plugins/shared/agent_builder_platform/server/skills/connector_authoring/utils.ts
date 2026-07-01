/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-plugin/common';

export interface ConnectorTypeAvailabilityOptions {
  /** Include connector types marked deprecated in the Actions registry. Defaults to `false`. */
  includeDeprecated?: boolean;
  /** Include connector types disabled via Kibana config (`enabledInConfig: false`). Defaults to `false`. */
  includeDisabledInConfig?: boolean;
}

/**
 * Whether a connector type should be offered to the user from chat.
 *
 * System action types are never proposable (they aren't user-creatable
 * connector instances). By default, this also excludes deprecated types and
 * types disabled via config, since we don't want the agent to steer a user
 * towards creating a connector that's discouraged or that can't actually be
 * configured. Shared by `list_connector_types` and `propose_connector` so the
 * two tools can't drift apart.
 */
export const isConnectorTypeAvailable = (
  actionType: ActionType,
  {
    includeDeprecated = false,
    includeDisabledInConfig = false,
  }: ConnectorTypeAvailabilityOptions = {}
): boolean => {
  return (
    !actionType.isSystemActionType &&
    (includeDeprecated || !actionType.isDeprecated) &&
    (includeDisabledInConfig || actionType.enabledInConfig)
  );
};
