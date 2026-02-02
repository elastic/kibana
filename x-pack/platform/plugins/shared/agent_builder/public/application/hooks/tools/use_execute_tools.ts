/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import type { ExecuteToolResponse } from '../../../../common/http_api/tools';
import { useAgentBuilderServices } from '../use_agent_builder_service';

export interface ExecuteToolParams {
  toolId: string;
  toolParams: Record<string, unknown>;
}

type ExecuteToolMutationOptions = UseMutationOptions<ExecuteToolResponse, Error, ExecuteToolParams>;

export type ExecuteToolSuccessCallback = NonNullable<ExecuteToolMutationOptions['onSuccess']>;
export type ExecuteToolErrorCallback = NonNullable<ExecuteToolMutationOptions['onError']>;
export type ExecuteToolSettledCallback = NonNullable<ExecuteToolMutationOptions['onSettled']>;

export const useExecuteTool = ({
  onSuccess,
  onError,
  onSettled,
}: {
  onSuccess?: ExecuteToolSuccessCallback;
  onError?: ExecuteToolErrorCallback;
  onSettled?: ExecuteToolSettledCallback;
} = {}) => {
  const { toolsService } = useAgentBuilderServices();

  const mutationFn = ({ toolId, toolParams }: ExecuteToolParams): Promise<ExecuteToolResponse> =>
    toolsService.execute({ toolId, toolParams });

  const { mutateAsync, isLoading, error } = useMutation<
    ExecuteToolResponse,
    Error,
    ExecuteToolParams
  >(mutationFn, {
    onSuccess,
    onError,
    onSettled,
  });

  return {
    executeTool: mutateAsync,
    isLoading,
    error,
  };
};
