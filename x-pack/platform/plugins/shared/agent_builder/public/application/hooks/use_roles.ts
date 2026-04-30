/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

export interface KibanaRole {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface KibanaRoleApiItem {
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  // Roles flagged with `_reserved: true` in metadata are predefined and not deletable.
}

/**
 * Fetches the list of Kibana roles. Used to populate the ACL role-grant picker.
 */
export const useRoles = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { services } = useKibana();
  const http = services.http;

  return useQuery({
    queryKey: queryKeys.security.roles,
    enabled: enabled && Boolean(http),
    queryFn: async (): Promise<KibanaRole[]> => {
      if (!http) return [];
      const response = await http.get<KibanaRoleApiItem[]>('/api/security/role');
      return response.map((role) => ({
        name: role.name,
        description: role.description ?? undefined,
        metadata: role.metadata,
      }));
    },
  });
};
