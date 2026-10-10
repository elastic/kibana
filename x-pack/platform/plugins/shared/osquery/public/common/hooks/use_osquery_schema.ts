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
import fallbackSchemaJson from '../../../common/schemas/osquery/v5.19.0.json';

let fallbackOsquerySchema: OsqueryTable[] | null = null;
const getFallbackOsquerySchema = (): OsqueryTable[] => {
  if (!fallbackOsquerySchema) {
    fallbackOsquerySchema = sortBy(fallbackSchemaJson as OsqueryTable[], 'name');
  }

  return fallbackOsquerySchema;
};

const SCHEMA_STALE_TIME_MS = 5 * 60 * 1000;

export const useOsquerySchema = () => {
  const { http } = useKibana().services;

  const query = useQuery<OsquerySchemaResponse>(
    ['osquerySchema'],
    () =>
      http.get<OsquerySchemaResponse>(OSQUERY_SCHEMA_API_ROUTE, {
        version: API_VERSIONS.internal.v1,
      }),
    {
      // Finite so installing or upgrading Osquery Manager reaches the version
      // picker without a page reload. Not shorter: the response carries the full
      // osquery schema, which every query editor mount would otherwise refetch.
      staleTime: SCHEMA_STALE_TIME_MS,
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

  const pkgVersion = useMemo(() => query.data?.pkgVersion, [query.data?.pkgVersion]);

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    osqueryVersion,
    pkgVersion,
  };
};
