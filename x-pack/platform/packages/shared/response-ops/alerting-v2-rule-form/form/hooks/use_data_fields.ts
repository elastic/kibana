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
import { getESQLAdHocDataview } from '@kbn/esql-utils';

interface UseDataFieldsProps {
  query: string;
  http: HttpStart;
  dataViews: DataViewsPublicPluginStart;
  onSuccess?: (fields: DataViewFieldMap) => void;
}

export const useDataFields = ({ query, http, dataViews, onSuccess }: UseDataFieldsProps) => {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const fieldsQuery = useQuery({
    queryKey: ['dataFields', query],
    queryFn: async () => {
      const dataView = await getESQLAdHocDataview({
        dataViewsService: dataViews,
        query,
        http,
      });

      if (!dataView) {
        return {};
      }

      const fields = dataView.fields.toSpec();
      return fields || {};
    },
    enabled: Boolean(query),
    refetchOnWindowFocus: false,
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
  };
};
