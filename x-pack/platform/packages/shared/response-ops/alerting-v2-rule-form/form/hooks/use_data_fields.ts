/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { useQuery } from '@kbn/react-query';
import { getESQLAdHocDataview, getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import type { ISearchGeneric } from '@kbn/search-types';
import { ruleFormKeys } from './query_key_factory';

interface UseDataFieldsProps {
  query: string;
  http: HttpStart;
  dataViews: DataViewsPublicPluginStart;
  onSuccess?: (fields: DataViewFieldMap) => void;
  /**
   * When provided, ES|QL column introspection (`LIMIT 0`) is used for field discovery
   * instead of the DataView field-caps API. Preferred for all ES|QL sources because it
   * reflects the actual schema the query will return; required for federated datasets
   * that don't exist as Elasticsearch indices and therefore can't be introspected via
   * field-caps.
   */
  search?: ISearchGeneric;
}

export const useDataFields = ({
  query,
  http,
  dataViews,
  onSuccess,
  search,
}: UseDataFieldsProps) => {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const fieldsQuery = useQuery({
    queryKey: [...ruleFormKeys.dataFields(query), { withSearch: Boolean(search) }],
    queryFn: async ({ signal }) => {
      // ES|QL column introspection path: avoids _field_caps, works for all FROM sources.
      // getESQLQueryColumnsRaw is used without dropNullColumns so that `columns` always
      // carries the full schema — some dataset types (e.g. Parquet, NDJSON) don't
      // populate `all_columns`, which dropNullColumns:true relies on for schema recovery.
      if (search) {
        const rawColumns = await getESQLQueryColumnsRaw({ esqlQuery: query, search, signal });
        return Object.fromEntries(
          rawColumns.map((col) => [
            col.name,
            { name: col.name, type: col.type, searchable: true, aggregatable: true },
          ])
        ) as DataViewFieldMap;
      }

      // Legacy path: DataView field-caps API. Used when `search` is not provided
      // (e.g. external consumers that have not opted into ES|QL column introspection).
      const dataView = await getESQLAdHocDataview({
        dataViewsService: dataViews,
        query,
        http,
      });

      if (!dataView) {
        return {};
      }

      return dataView.fields.toSpec() ?? {};
    },
    enabled: Boolean(query),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  // Call onSuccess when data is fetched for the current query
  // Include dataUpdatedAt to detect when new data arrives (even if data reference is same)
  useEffect(() => {
    if (fieldsQuery.data && Object.keys(fieldsQuery.data).length > 0 && onSuccessRef.current) {
      onSuccessRef.current(fieldsQuery.data);
    }
  }, [fieldsQuery.data, fieldsQuery.dataUpdatedAt]);

  return {
    ...fieldsQuery,
    data: fieldsQuery.data ?? {},
    // Surface isFetching as isLoading so consumers (e.g. useResolveTimeField) correctly
    // treat keepPreviousData background refetches as "in progress" and avoid acting on
    // stale field maps from a previous query key.
    isLoading: fieldsQuery.isLoading || fieldsQuery.isFetching,
  };
};
