/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import { EsqlToolDefinitionWithSchema, isEsqlTool } from '@kbn/onechat-common/tools/esql';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

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

export const useBaseTools = () => {
  const { tools, ...rest } = useOnechatTools();

  const baseTools = useMemo(() => tools.filter((tool) => tool.type === ToolType.builtin), [tools]);
  return { tools: baseTools, ...rest };
};

export const useEsqlTools = () => {
  const { tools, ...rest } = useOnechatTools();

  const esqlTools = useMemo(
    // inferred type predicates are implemented in Typescript 5.5
    () => tools.filter(isEsqlTool) as EsqlToolDefinitionWithSchema[],
    [tools]
  );
  return { tools: esqlTools, ...rest };
};
