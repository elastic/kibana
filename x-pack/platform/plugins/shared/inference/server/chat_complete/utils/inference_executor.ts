/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type {
  ActionsClient,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { InferenceConnector } from '../../../common/connectors';
import { getConnectorById } from '../../util/get_connector_by_id';

export interface InferenceInvokeOptions {
  subAction: string;
  subActionParams?: Record<string, unknown>;
}

export type InferenceInvokeResult<Data = unknown> = ActionTypeExecutorResult<Data>;

/**
 * Represent the actual interface to communicate with the inference model.
 *
 * In practice, for now it's just a thin abstraction around the action client.
 */
export interface InferenceExecutor {
  getConnector: () => InferenceConnector;
  invoke(params: InferenceInvokeOptions): Promise<InferenceInvokeResult>;
}

export const createInferenceExecutor = ({
  connector,
  actionsClient,
}: {
  connector: InferenceConnector;
  actionsClient: ActionsClient;
}): InferenceExecutor => {
  return {
    getConnector: () => connector,
    async invoke({ subAction, subActionParams }): Promise<InferenceInvokeResult> {
      return await actionsClient.execute({
        actionId: connector.connectorId,
        params: {
          subAction,
          subActionParams,
        },
      });
    },
  };
};

export const getInferenceExecutor = async ({
  connectorId,
  actions,
  request,
}: {
  connectorId: string;
  actions: ActionsPluginStart;
  request: KibanaRequest;
}) => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const connector = await getConnectorById({ connectorId, actionsClient });
  return createInferenceExecutor({ actionsClient, connector });
};
