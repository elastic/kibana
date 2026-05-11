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
}

interface PredefinedRoleApiItem {
  name: string;
  description?: string;
}

const PREDEFINED_ROLES_PATH = '/internal/agent_builder/predefined_roles';

export const useRoles = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { services } = useKibana();
  const http = services.http;

  return useQuery({
    queryKey: queryKeys.security.roles,
    enabled: enabled && Boolean(http),
    queryFn: async (): Promise<KibanaRole[]> => {
      if (!http) return [];
      try {
        const response = await http.get<PredefinedRoleApiItem[]>(PREDEFINED_ROLES_PATH);
        return response.map((role) => ({
          name: role.name,
          description: role.description,
        }));
      } catch {
        return [];
      }
    },
  });
};
