/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { ConnectorResponse } from '@kbn/actions-plugin/common/routes/connector/response';

/**
 * Request payload for creating a stack connector.
 * Re-exported from @kbn/actions-plugin to ensure sync with API.
 *
 * POST /api/actions/connector
 */
export type { CreateConnectorRequestBody as CreateStackConnectorRequest } from '@kbn/actions-plugin/common/routes/connector/apis/create';

/**
 * Request payload for updating a stack connector.
 * Re-exported from @kbn/actions-plugin to ensure sync with API.
 *
 * PUT /api/actions/connector/{id}
 */
export type { UpdateConnectorBody as UpdateStackConnectorRequest } from '@kbn/actions-plugin/common/routes/connector/apis/update';

/**
 * API response from creating, updating, or getting a stack connector.
 * Re-exported from @kbn/actions-plugin to ensure sync with API.
 */
export type StackConnectorApiResponse = ConnectorResponse;

/**
 * Transform a stack connector API response from snake_case to camelCase.
 *
 * @param data - Raw API response (snake_case)
 * @returns Transformed ActionConnector (camelCase)
 */
export const transformStackConnectorResponse = (
  data: StackConnectorApiResponse
): ActionConnector => {
  const {
    connector_type_id: actionTypeId,
    is_preconfigured: isPreconfigured,
    is_deprecated: isDeprecated,
    is_missing_secrets: isMissingSecrets,
    is_system_action: isSystemAction,
    is_connector_type_deprecated: isConnectorTypeDeprecated,
    ...rest
  } = data;

  return {
    actionTypeId,
    isPreconfigured,
    isDeprecated,
    isMissingSecrets: isMissingSecrets ?? false,
    isSystemAction,
    isConnectorTypeDeprecated,
    secrets: {}, // Secrets are never returned from API for security
    ...rest,
  } as ActionConnector;
};
