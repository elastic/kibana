/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import { EsqlToolDefinitionWithSchema } from '@kbn/onechat-common/tools/esql';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

export interface UseOnechatToolsProps {
  includeSystemTools?: boolean;
}

export const useOnechatTools = ({ includeSystemTools }: UseOnechatToolsProps = {}) => {
  const { toolsService } = useOnechatServices();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.tools.all,
    queryFn: () => toolsService.list(),
  });

  const tools = useMemo(() => {
    if (!data) {
      return [];
    }
    if (includeSystemTools) {
      return data;
    }
    return data.filter((tool) => tool.type !== ToolType.builtin);
  }, [data, includeSystemTools]);

  return { tools, isLoading, error };
};

export const useOnechatTool = (toolId?: string) => {
  const { toolsService } = useOnechatServices();

  const {
    data: tool,
    isLoading,
    error,
  } = useQuery({
    enabled: !!toolId,
    queryKey: queryKeys.tools.byId(toolId),
    // toolId! is safe because of the enabled check above
    queryFn: () => toolsService.get({ toolId: toolId! }),
  });

  return { tool: tool as EsqlToolDefinitionWithSchema | undefined, isLoading, error };
};
