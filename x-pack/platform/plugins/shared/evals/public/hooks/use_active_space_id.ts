/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/** Resolves the active space id, falling back to the default space when spaces is unavailable. */
export const useActiveSpaceId = (): { spaceId?: string; isLoading: boolean } => {
  const {
    services: { spaces },
  } = useKibana<{ spaces?: SpacesPluginStart }>();

  const { data, isLoading } = useQuery({
    queryKey: ['evals', 'active-space-id'],
    refetchOnWindowFocus: false,
    queryFn: async () => (spaces ? (await spaces.getActiveSpace()).id : DEFAULT_SPACE_ID),
  });

  return { spaceId: data, isLoading };
};
