/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest } from '@kbn/core/server';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import type { ConnectorCallbackRequest, ConnectorCallbackResult } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';
import { handleElasticsearchCallback } from './elasticsearch_connector';

export const createConnectorCallbackHandler =
  ({
    getActionsClient,
    logger,
  }: {
    getActionsClient: ((req: KibanaRequest) => Promise<any>) | undefined;
    logger: Logger;
  }) =>
  async (
    callContext: SandboxCallContext,
    cb: ConnectorCallbackRequest
  ): Promise<ConnectorCallbackResult> => {
    // Step 0: synthetic elasticsearch connector — bypass allow-list, no ActionsClient needed
    if (cb.connector_id === 'elasticsearch') {
      return handleElasticsearchCallback(cb, callContext.esClient);
    }

    // Step 1: guard against missing ActionsClient
    if (!getActionsClient) {
      return {
        status: 'error',
        error_message: 'Connectors are not available in this deployment',
      };
    }

    // Step 2: obtain an ActionsClient for this request
    let actionsClient: Awaited<ReturnType<typeof getActionsClient>>;
    try {
      actionsClient = await getActionsClient(callContext.request);
    } catch (err) {
      return { status: 'error', error_message: `Failed to get actions client: ${err}` };
    }

    // Step 3: allow-list check
    if (!callContext.allowedConnectorIds.includes(cb.connector_id)) {
      return {
        status: 'error',
        error_message:
          `Connector '${cb.connector_id}' is not assigned to this agent. ` +
          `Assigned connectors: ${callContext.allowedConnectorIds.join(', ') || 'none'}. ` +
          `Check /workspace/connectors.md.`,
      };
    }

    // Step 4: parse sub_action_params JSON
    let subActionParams: Record<string, unknown> = {};
    if (cb.sub_action_params.length > 0) {
      try {
        subActionParams = JSON.parse(cb.sub_action_params.toString('utf8'));
      } catch (err) {
        return { status: 'error', error_message: `Invalid sub_action_params JSON: ${err}` };
      }
    }

    // Step 5: resolve connector type
    let connector: Awaited<ReturnType<typeof actionsClient.get>>;
    try {
      connector = await actionsClient.get({ id: cb.connector_id });
    } catch (err) {
      return {
        status: 'error',
        error_message: `Failed to resolve connector '${cb.connector_id}': ${err}`,
      };
    }

    // Step 6: gate sub-action via connector spec (skip for legacy connectors with no spec)
    const spec = getConnectorSpec(connector.actionTypeId);
    if (spec !== undefined && !isToolAction(spec, cb.sub_action)) {
      return {
        status: 'error',
        error_message:
          `Sub-action '${cb.sub_action}' is not available on connector type '${connector.actionTypeId}'. ` +
          `Check /workspace/connectors.md for valid sub-actions.`,
      };
    }

    // Step 7: execute
    let executeResult: Awaited<ReturnType<typeof actionsClient.execute>>;
    try {
      executeResult = await actionsClient.execute({
        actionId: cb.connector_id,
        params: { subAction: cb.sub_action, subActionParams },
      });
    } catch (err) {
      return {
        status: 'error',
        error_message: `Failed to execute sub-action '${cb.sub_action}' on connector '${cb.connector_id}': ${err}`,
      };
    }

    // Step 8: map result
    if (executeResult.status === 'error') {
      if (executeResult.errorName === 'ConnectorAuthorizationError') {
        return {
          status: 'error',
          error_message:
            'Connector requires authorization in Kibana first. Contact your administrator.',
        };
      }
      const msg = [executeResult.message, executeResult.serviceMessage].filter(Boolean).join(': ');
      return { status: 'error', error_message: msg || 'Connector returned an error' };
    }

    const serialized = Buffer.from(JSON.stringify(executeResult.data ?? null));
    if (serialized.length > 1_048_576) {
      return {
        status: 'error',
        error_message: 'Response too large (limit 1 MiB). Request fewer fields or smaller page.',
      };
    }
    return { status: 'ok', data: serialized };
  };
