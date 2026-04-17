/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { sortBy } from 'lodash';
import {
  API_VERSIONS,
  FALLBACK_OSQUERY_VERSION,
  OSQUERY_SCHEMA_API_ROUTE,
} from '../../../common/constants';
import type { OsquerySchemaResponse, OsqueryTable } from '../../../common/types/schema';
import { useKibana } from '../lib/kibana';
// Static path required by webpack — must match FALLBACK_OSQUERY_VERSION in common/constants.ts
import fallbackSchemaJson from '../schemas/osquery/v5.19.0.json';

let fallbackOsquerySchema: OsqueryTable[] | null = null;
const getFallbackOsquerySchema = (): OsqueryTable[] => {
  if (!fallbackOsquerySchema) {
    fallbackOsquerySchema = sortBy(fallbackSchemaJson as OsqueryTable[], 'name');
  }

  return fallbackOsquerySchema;
};

export const useOsquerySchema = () => {
  const { http } = useKibana().services;

  const query = useQuery<OsquerySchemaResponse>(
    ['osquerySchema'],
    () =>
      http.get<OsquerySchemaResponse>(OSQUERY_SCHEMA_API_ROUTE, {
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
      return sortBy(query.data.data, 'name');
    }

    if (query.isError) {
      return getFallbackOsquerySchema();
    }

    return undefined;
  }, [query.data, query.isError]);

  const osqueryVersion = useMemo(
    () => query.data?.version ?? FALLBACK_OSQUERY_VERSION,
    [query.data?.version]
  );

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    osqueryVersion,
  };
};
