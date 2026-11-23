/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { InferenceConnectorsResponse } from '../../common/types';
import { CHAT_COMPLETION_TASK_TYPE, INFERENCE_CONNECTORS_QUERY_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';

const INFERENCE_CONNECTORS_API = '/internal/inference/connectors';

/** Lists the models of a task type: chat models by default, else that task type's inference endpoints. */
export const useConnectors = (taskType: string = CHAT_COMPLETION_TASK_TYPE) => {
  const { services } = useKibana();
  const isChatCompletion = taskType === CHAT_COMPLETION_TASK_TYPE;

  return useQuery({
    queryKey: isChatCompletion
      ? [INFERENCE_CONNECTORS_QUERY_KEY]
      : [INFERENCE_CONNECTORS_QUERY_KEY, taskType],
    queryFn: async () => {
      const response = await services.http.get<InferenceConnectorsResponse>(
        INFERENCE_CONNECTORS_API,
        isChatCompletion ? {} : { query: { taskType } }
      );

      return response.connectors;
    },
  });
};
