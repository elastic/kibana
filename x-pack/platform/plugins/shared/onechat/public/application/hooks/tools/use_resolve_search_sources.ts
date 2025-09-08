/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useOnechatServices } from '../use_onechat_service';
import { queryKeys } from '../../query_keys';

export const useIndexSearchSources = ({ pattern }: { pattern: string }) => {
  const { toolsService } = useOnechatServices();
  const enabled = !!pattern && pattern.trim().length > 0;
  const result = useQuery({
    enabled,
    queryKey: queryKeys.tools.indexSearch.resolveTargets(pattern),
    queryFn: () => toolsService.resolveSearchSources({ pattern }),
  });
  return result;
};
