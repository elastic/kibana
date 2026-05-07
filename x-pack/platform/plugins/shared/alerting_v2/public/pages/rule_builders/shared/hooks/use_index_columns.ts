/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { useFormContext, useWatch } from 'react-hook-form';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataSourceFormValues } from '../types';

export interface IndexColumn {
  name: string;
  type: string;
}

const NUMERIC_TYPES = new Set([
  'integer',
  'long',
  'short',
  'byte',
  'float',
  'double',
  'half_float',
  'scaled_float',
  'unsigned_long',
]);

interface UseIndexColumnsParams {
  data: DataPublicPluginStart;
}

export const useIndexColumns = ({ data }: UseIndexColumnsParams) => {
  const { control } = useFormContext<DataSourceFormValues>();
  const indexPattern = useWatch({ control, name: 'indexPattern' });

  const baseQuery = useMemo(() => (indexPattern ? `FROM ${indexPattern}` : ''), [indexPattern]);

  const enabled = Boolean(baseQuery);

  const { data: columns, isFetching } = useQuery({
    queryKey: ['ruleBuilderIndexColumns', baseQuery],
    queryFn: async ({ signal }) => {
      const rawColumns = await getESQLQueryColumnsRaw({
        esqlQuery: baseQuery,
        search: data.search.search,
        signal,
        dropNullColumns: true,
      });
      return rawColumns.map(({ name, type }) => ({ name, type }));
    },
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const allColumns = useMemo<IndexColumn[]>(() => columns ?? [], [columns]);

  const numericColumns = useMemo(
    () => allColumns.filter((col) => NUMERIC_TYPES.has(col.type)),
    [allColumns]
  );

  return {
    allColumns,
    numericColumns,
    isLoading: enabled && isFetching,
  };
};
