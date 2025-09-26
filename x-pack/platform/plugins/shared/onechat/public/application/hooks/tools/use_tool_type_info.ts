/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../query_keys';
import { useOnechatServices } from '../use_onechat_service';

export const useToolTypes = () => {
  const { toolsService } = useOnechatServices();

  const { data: toolTypes, isLoading } = useQuery({
    queryKey: queryKeys.tools.typeInfo,
    queryFn: () => toolsService.getToolTypes(),
  });

  return { toolTypes, isLoading };
};
