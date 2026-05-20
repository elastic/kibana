/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { API_VERSIONS, ECS_SCHEMA_API_ROUTE } from '../../../common/constants';
import type { EcsSchemaResponse, EcsField } from '../../../common/types/schema';
import { useKibana } from '../lib/kibana';
// Static path required by webpack — must match FALLBACK_ECS_VERSION in common/constants.ts
import fallbackEcsSchemaJson from '../../../common/schemas/ecs/v9.2.0.json';

let fallbackEcsSchema: EcsField[] | null = null;
const getFallbackEcsSchema = (): EcsField[] => {
  if (!fallbackEcsSchema) {
    fallbackEcsSchema = fallbackEcsSchemaJson as EcsField[];
  }

  return fallbackEcsSchema;
};

export const useEcsSchema = () => {
  const { http } = useKibana().services;

  const query = useQuery<EcsSchemaResponse>(
    ['ecsSchema'],
    () =>
      http.get<EcsSchemaResponse>(ECS_SCHEMA_API_ROUTE, {
        version: API_VERSIONS.internal.v1,
      }),
    {
      staleTime: Infinity,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );

  const data = useMemo(() => {
    if (query.data?.data) {
      return query.data.data;
    }

    if (query.isError) {
      return getFallbackEcsSchema();
    }

    return undefined;
  }, [query.data, query.isError]);

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
