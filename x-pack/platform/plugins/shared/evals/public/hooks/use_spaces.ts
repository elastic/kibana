/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import { API_VERSIONS as SPACES_API_VERSIONS } from '@kbn/spaces-plugin/common';
import type { Space, SpacesPluginStart } from '@kbn/spaces-plugin/public';

/** Minimal shape of a space needed to render the picker. */
export interface AccessibleSpace {
  id: string;
  name: string;
}

export interface AccessibleSpacesResult {
  /**
   * Whether a space picker is worth showing: the Spaces plugin is available and
   * the deployment has more than the default space. Single-space deployments have
   * nothing to choose, so the picker is hidden and scores go to the active space.
   */
  isEnabled: boolean;
  isLoading: boolean;
  /** Active (creating) space id; the picker's default selection. */
  activeSpaceId?: string;
  /** All spaces the current user can access. */
  spaces: AccessibleSpace[];
}

/**
 * Lists the spaces the current user can access (plus the active space), so an
 * experiment can be assigned to spaces other than the one it is created in.
 *
 * The public Spaces contract does not expose a list, so the accessible spaces are
 * read from the public `GET /api/spaces/space` endpoint (which already scopes to
 * the caller's authorized spaces).
 */
export const useAccessibleSpaces = (options?: { enabled?: boolean }): AccessibleSpacesResult => {
  const { services } = useKibana<{ http?: HttpStart; spaces?: SpacesPluginStart }>();
  const { http, spaces } = services;
  const isEnabled = (options?.enabled ?? true) && !!http && !!spaces && !spaces.hasOnlyDefaultSpace;

  const query = useQuery({
    queryKey: ['evals', 'accessible-spaces'],
    enabled: isEnabled,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [allSpaces, activeSpace] = await Promise.all([
        http!.get<Space[]>('/api/spaces/space', { version: SPACES_API_VERSIONS.public.v1 }),
        spaces!.getActiveSpace(),
      ]);
      return {
        activeSpaceId: activeSpace.id,
        spaces: allSpaces.map((space) => ({ id: space.id, name: space.name })),
      };
    },
  });

  return {
    isEnabled,
    isLoading: isEnabled && query.isLoading,
    activeSpaceId: query.data?.activeSpaceId,
    spaces: query.data?.spaces ?? [],
  };
};
