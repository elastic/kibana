/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDefinitionWithSchema, ToolType } from '@kbn/onechat-common';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { CreateToolPayload } from '../../../common/http_api/tools';
import { queryKeys } from '../query_keys';
import { useOnechatServices } from './use_onechat_service';

export const useOnechatTools = () => {
  const { toolsService } = useOnechatServices();

  const {
    data: tools,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.tools.all,
    queryFn: () => toolsService.list(),
  });

  return { tools: tools ?? [], isLoading, error };
};

export const useOnechatBaseTools = () => {
  const { tools, ...rest } = useOnechatTools();

  const baseTools = useMemo(() => tools.filter((tool) => tool.type === ToolType.builtin), [tools]);
  return { tools: baseTools, ...rest };
};

export const useOnechatEsqlTools = () => {
  const { tools, ...rest } = useOnechatTools();

  const esqlTools = useMemo(() => tools.filter((tool) => tool.type === ToolType.esql), [tools]);
  return { tools: esqlTools, ...rest };
};

export const useOnechatCreateTool = ({
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

export const useOnechatToolsTags = () => {
  const { tools, isLoading, error } = useOnechatTools();

  const tags = useMemo((): string[] => {
    if (isLoading || error) return [];

    // Return unique tags across all tools
    return [
      ...tools.reduce((tagsSet, tool) => {
        tool.tags.forEach((tag) => tagsSet.add(tag));
        return tagsSet;
      }, new Set<string>()),
    ];
  }, [tools, isLoading, error]);

  return { tags, isLoading };
};
