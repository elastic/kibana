/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import {
  chatEditPipeline,
  type ChatEditPipelineRequest,
  type ChatEditPipelineResponse,
} from '../lib/api';
import { useKibana } from './use_kibana';

export interface UseChatEditPipelineResult {
  chatEditPipelineMutation: ReturnType<
    typeof useMutation<ChatEditPipelineResponse, Error, ChatEditPipelineRequest>
  >;
  isLoading: boolean;
  error: Error | null;
}

export function useChatEditPipeline(): UseChatEditPipelineResult {
  const { http } = useKibana().services;

  const mutation = useMutation<ChatEditPipelineResponse, Error, ChatEditPipelineRequest>({
    mutationFn: async (request: ChatEditPipelineRequest) => {
      return chatEditPipeline({ http, ...request });
    },
  });

  return {
    chatEditPipelineMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
