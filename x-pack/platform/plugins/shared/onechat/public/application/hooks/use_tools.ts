/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useOnechatServices } from './use_onechat_service';

export const useOnechatTools = () => {
  const { toolsService } = useOnechatServices();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tools', 'list'],
    queryFn: () => toolsService.list(),
  });

  return { tools: data?.tools ?? [], isLoading, error };
};
