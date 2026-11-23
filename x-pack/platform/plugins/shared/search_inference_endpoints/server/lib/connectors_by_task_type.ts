/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createInferenceRequestError, type InferenceConnector } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { CHAT_COMPLETION_TASK_TYPE } from '../../common/constants';

type InferenceConnectorApis = Pick<InferenceServerStart, 'getConnectorList' | 'getConnectorById'>;

/** Lists the models a feature of the given task type can use: chat models by default. */
export const getConnectorListByTaskType = (
  inference: InferenceConnectorApis,
  request: KibanaRequest,
  taskType: string = CHAT_COMPLETION_TASK_TYPE
): Promise<InferenceConnector[]> => {
  if (taskType === CHAT_COMPLETION_TASK_TYPE) {
    return inference.getConnectorList(request);
  }

  return inference.getConnectorList(request, { taskType });
};

/** Finds a model by id among the models of the given task type; throws a 404 when it is missing. */
export const getConnectorByIdAndTaskType = async (
  inference: InferenceConnectorApis,
  id: string,
  request: KibanaRequest,
  taskType: string = CHAT_COMPLETION_TASK_TYPE
): Promise<InferenceConnector> => {
  if (taskType === CHAT_COMPLETION_TASK_TYPE) {
    return inference.getConnectorById(id, request);
  }

  const connectors = await inference.getConnectorList(request, { taskType });
  const connector = connectors.find(({ connectorId }) => connectorId === id);

  if (!connector) {
    throw createInferenceRequestError(`No "${taskType}" inference endpoint with id "${id}"`, 404);
  }

  return connector;
};

/** An unregistered feature counts as a chat completion one, as it did before task types. */
export const isChatCompletionFeature = (feature?: { taskType: string }): boolean =>
  !feature || feature.taskType === CHAT_COMPLETION_TASK_TYPE;
