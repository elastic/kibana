/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { builtinToolProviderId, esqlToolProviderId } from '@kbn/onechat-common';
import { useOnechatServices } from './use_onechat_service';

export const useOnechatTools = () => {
  const { toolsService } = useOnechatServices();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tools', 'list'],
    queryFn: () => toolsService.list(),
  });

  return { tools: data?.tools ?? [], isLoading, error };
};

export const useOnechatBaseTools = () => {
  const { tools, ...rest } = useOnechatTools();

  const baseTools = useMemo(
    () => tools.filter((tool) => tool.meta.providerId === builtinToolProviderId),
    [tools]
  );
  return { tools: baseTools, ...rest };
};

export const useOnechatEsqlTools = () => {
  const { tools, ...rest } = useOnechatTools();

  const esqlTools = useMemo(
    () => tools.filter((tool) => tool.meta.providerId === esqlToolProviderId),
    [tools]
  );
  return { tools: esqlTools, ...rest };
};

export const useOnechatToolsTags = () => {
  const { tools, isLoading, error } = useOnechatTools();

  const tags = useMemo(() => {
    if (isLoading || error) return [];

    const tagSet = tools.reduce((acc, tool) => {
      tool.meta.tags.forEach((tag) => acc.add(tag));
      return acc;
    }, new Set<string>());

    return Array.from(tagSet);
  }, [tools, isLoading, error]);

  return { tags, isLoading };
};
