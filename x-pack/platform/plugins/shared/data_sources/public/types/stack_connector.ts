/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

/**
 * API response type for GET /api/actions/connector/{id}
 *
 * This is the raw response from the Actions plugin API (snake_case).
 */
export interface StackConnectorApiResponse {
  id: string;
  name: string;
  config?: Record<string, unknown>;
  connector_type_id: string;
  is_missing_secrets?: boolean;
  is_preconfigured: boolean;
  is_deprecated: boolean;
  is_system_action: boolean;
  is_connector_type_deprecated: boolean;
  referenced_by_count?: number;
}

/**
 * Transform a stack connector API response from snake_case to camelCase.
 *
 * @param data - Raw API response
 * @returns Transformed ActionConnector
 */
export const transformStackConnectorResponse = (
  data: StackConnectorApiResponse
): ActionConnector => {
  const {
    connector_type_id: actionTypeId,
    is_preconfigured: isPreconfigured,
    is_deprecated: isDeprecated,
    referenced_by_count: referencedByCount,
    is_missing_secrets: isMissingSecrets,
    is_system_action: isSystemAction,
    is_connector_type_deprecated: isConnectorTypeDeprecated,
    ...rest
  } = data;

  return {
    actionTypeId,
    isPreconfigured,
    isDeprecated,
    referencedByCount,
    isMissingSecrets,
    isSystemAction,
    isConnectorTypeDeprecated,
    secrets: {}, // Secrets are never returned from API for security
    ...rest,
  } as ActionConnector;
};
