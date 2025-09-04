/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

export const useIndexSearchSources = ({
  pattern,
  page = 1,
  perPage = 5,
}: {
  pattern: string;
  page?: number;
  perPage?: number;
}) => {
  const { toolsService } = useOnechatServices();
  const enabled = !!pattern && pattern.trim().length > 0;
  const result = useQuery({
    enabled,
    queryKey: queryKeys.tools.byId(`resolve:${pattern}:${page}:${perPage}`),
    queryFn: () => toolsService.resolveSearchSources({ pattern, page, perPage }),
    staleTime: 30_000,
    keepPreviousData: true,
  });
  return result;
};
