/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceConnector } from '@kbn/inference-common';
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
  invoke<Data = unknown>(params: InferenceInvokeOptions): Promise<InferenceInvokeResult<Data>>;
}

export const createInferenceExecutor = ({
  connector,
  actions,
  request,
}: {
  connector: InferenceConnector;
  actions: ActionsPluginStart;
  request: KibanaRequest;
}): InferenceExecutor => {
  return {
    getConnector: () => connector,
    async invoke({ subAction, subActionParams }): Promise<InferenceInvokeResult<any>> {
      const actionsClient = await actions.getActionsClientWithRequest(request);
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
  const connector = await getConnectorById({ connectorId, actions, request });
  return createInferenceExecutor({ actions, connector, request });
};
