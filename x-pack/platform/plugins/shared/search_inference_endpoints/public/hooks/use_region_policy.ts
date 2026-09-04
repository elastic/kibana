/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { RegionPolicyResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { REGION_POLICY_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useRegionPolicy = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: [REGION_POLICY_QUERY_KEY],
    queryFn: async () => {
      try {
        return await services.http.get<RegionPolicyResponse>(APIRoutes.REGION_POLICY, {
          version: ROUTE_VERSIONS.v1,
        });
      } catch (err) {
        // 404 means no policy has been set yet — treat as empty policy
        if (err?.response?.status === 404 || err?.body?.statusCode === 404) {
          return null;
        }
        throw err;
      }
    },
  });
};
