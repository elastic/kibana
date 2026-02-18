/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import type { ActiveSource } from '../../types/connector';
import { generateCloneName } from '../../utils/clone_name_generator';

/**
 * Hook to get clone information for a source
 * Returns the suggested clone name based on existing sources
 */
export function useCloneActiveSource() {
  const queryClient = useQueryClient();

  const getCloneName = (sourceToClone: ActiveSource): string => {
    const allSources = queryClient.getQueryData<{ dataSources: ActiveSource[] }>(
      queryKeys.dataSources.list()
    );

    return generateCloneName(sourceToClone.name, allSources?.dataSources ?? []);
  };

  return { getCloneName };
}
