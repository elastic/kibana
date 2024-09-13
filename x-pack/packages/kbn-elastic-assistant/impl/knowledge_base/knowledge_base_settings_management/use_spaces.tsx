/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

export const useSpaces = (spacesApi: SpacesPluginStart) => {
  const { spacesDataPromise } = spacesApi.ui.useSpaces();

  const { data: spaces } = useQuery({
    queryKey: ['spaces'],
    queryFn: () => spacesDataPromise, // .getActiveSpace()
    select: (data) => data,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  const { data: currentSpace } = useQuery({
    queryKey: ['currentSpace'],
    queryFn: () => spacesApi.getActiveSpace(),
    select: (data) => data,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return {
    currentSpace,
    spaces,
  };
};
