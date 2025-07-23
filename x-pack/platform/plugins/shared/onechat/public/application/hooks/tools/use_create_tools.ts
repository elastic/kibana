/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { CreateToolPayload } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

export const useCreateTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (tool: ToolDefinitionWithSchema) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: (tool: CreateToolPayload) => toolsService.create(tool),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
  });

  return { createTool: mutateAsync, isLoading };
};

export const useCreateToolFlyout = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (tool: ToolDefinitionWithSchema) => void;
  onError?: (error: Error) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = (tool: ToolDefinitionWithSchema) => {
    setIsOpen(false);
    onSuccess?.(tool);
  };

  const { createTool: createToolMutation, isLoading } = useCreateTool({
    onSuccess: handleSuccess,
    onError,
  });

  const openFlyout = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
  }, []);

  const saveTool = useCallback(
    async (toolData: CreateToolPayload) => {
      await createToolMutation(toolData);
    },
    [createToolMutation]
  );

  return {
    isOpen,
    isLoading,
    openFlyout,
    saveTool,
    closeFlyout,
  };
};
