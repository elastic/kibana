/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

export interface SuggestedUser {
  username: string;
  full_name?: string;
  email?: string;
}

interface KibanaUserListItem {
  username: string;
  full_name?: string | null;
  email?: string | null;
  enabled?: boolean;
}

/**
 * Fetches the full list of Kibana users (filtered to enabled accounts).
 *
 * Uses `/internal/security/users`, which returns the entire user directory. We filter
 * client-side so the combobox can do incremental search without an extra round trip per
 * keystroke. This pattern matches what other Kibana picker UIs use against this endpoint.
 */
export const useSuggestUsers = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { services } = useKibana();
  const http = services.http;

  return useQuery({
    queryKey: queryKeys.security.users,
    enabled: enabled && Boolean(http),
    queryFn: async (): Promise<SuggestedUser[]> => {
      if (!http) return [];
      const response = await http.get<KibanaUserListItem[]>('/internal/security/users');
      return response
        .filter((user) => user.enabled !== false)
        .map((user) => ({
          username: user.username,
          full_name: user.full_name ?? undefined,
          email: user.email ?? undefined,
        }));
    },
  });
};
