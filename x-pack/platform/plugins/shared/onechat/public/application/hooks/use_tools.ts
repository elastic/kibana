/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ToolType } from '@kbn/onechat-common';
import { useOnechatServices } from './use_onechat_service';

export const useOnechatTools = () => {
  const { toolsService } = useOnechatServices();

  const {
    data: tools,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tools', 'list'],
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
