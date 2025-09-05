/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { ExecuteToolResponse } from '../../../../common/http_api/tools';
import { useOnechatServices } from '../use_onechat_service';

export interface ExecuteToolParams {
  toolId: string;
  toolParams: Record<string, unknown>;
}

export type ExecuteToolSuccessCallback = (data: ExecuteToolResponse) => void;
export type ExecuteToolErrorCallback = (error: Error) => void;

export const useExecuteTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: ExecuteToolSuccessCallback;
  onError?: ExecuteToolErrorCallback;
} = {}) => {
  const { toolsService } = useOnechatServices();

  const mutationFn = ({ toolId, toolParams }: ExecuteToolParams): Promise<ExecuteToolResponse> =>
    toolsService.execute(toolId, toolParams);

  const { mutateAsync, isLoading, error } = useMutation<
    ExecuteToolResponse,
    Error,
    ExecuteToolParams
  >(mutationFn, {
    onSuccess,
    onError,
  });

  return {
    executeTool: mutateAsync,
    isLoading,
    error,
  };
};
