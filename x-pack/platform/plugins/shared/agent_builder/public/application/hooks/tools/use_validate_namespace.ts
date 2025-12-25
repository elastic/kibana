/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

export interface UseValidateNamespaceOptions {
  namespace: string;
  enabled?: boolean;
}

export const useValidateNamespace = ({ namespace, enabled }: UseValidateNamespaceOptions) => {
  const { toolsService } = useAgentBuilderServices();

  const isEnabled = enabled ?? namespace.length > 0;

  const { data, isLoading, error, isError, isFetching } = useQuery({
    queryKey: queryKeys.tools.namespace.validate(namespace),
    queryFn: () => toolsService.validateNamespace({ namespace }),
    enabled: isEnabled,
    staleTime: 0,
  });

  return {
    isValid: data?.isValid ?? true,
    conflictingNamespaces: data?.conflictingNamespaces ?? [],
    isLoading: isLoading && isEnabled,
    isFetching,
    error,
    isError,
  };
};
