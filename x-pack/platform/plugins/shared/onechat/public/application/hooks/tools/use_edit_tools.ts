/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlToolDefinitionWithSchema, ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { UpdateToolPayload, UpdateToolResponse } from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

export const useEditTool = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (tool: UpdateToolResponse) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const { toolsService } = useOnechatServices();

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: ({ toolId, tool }: { toolId: string; tool: UpdateToolPayload }) =>
      toolsService.update(toolId, tool),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.all }),
  });

  return { updateTool: mutateAsync, isLoading };
};

export const useEditToolFlyout = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (tool: EsqlToolDefinitionWithSchema) => void;
  onError?: (error: Error) => void;
}) => {
  const [editingTool, setEditingTool] = useState<EsqlToolDefinitionWithSchema | null>(null);

  const handleSuccess = (tool: ToolDefinitionWithSchema) => {
    setEditingTool(null);
    onSuccess?.(tool as EsqlToolDefinitionWithSchema);
  };

  const { updateTool, isLoading } = useEditTool({
    onSuccess: handleSuccess,
    onError,
  });

  const openFlyout = useCallback((tool: EsqlToolDefinitionWithSchema) => {
    setEditingTool(tool);
  }, []);

  const closeFlyout = useCallback(() => {
    setEditingTool(null);
  }, []);

  const saveTool = useCallback(
    async (toolData: UpdateToolPayload) => {
      if (!editingTool) return;
      await updateTool({ toolId: editingTool.id, tool: toolData });
    },
    [updateTool, editingTool]
  );

  return {
    isOpen: !!editingTool,
    tool: editingTool,
    isLoading,
    openFlyout,
    closeFlyout,
    saveTool,
  };
};
