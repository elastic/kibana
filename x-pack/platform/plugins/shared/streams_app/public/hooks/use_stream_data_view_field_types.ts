/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

interface FieldTypeInfo {
  name: string;
  type: string;
  esType?: string;
}

/**
 * Fetches DataView field types for a stream with automatic caching via React Query.
 * Multiple components using this hook with the same streamName will share the same request.
 *
 * @param streamName - The name of the stream to fetch field types for
 * @returns Object containing field types map, loading state, and error
 */
export function useStreamDataViewFieldTypes(streamName: string) {
  const { dependencies } = useKibana();
  const { data } = dependencies.start;

  const {
    data: dataView,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['stream-dataview-field-types', streamName],
    queryFn: async () => {
      try {
        return await data.dataViews.create({
          title: streamName,
          timeFieldName: '@timestamp',
        });
      } catch (err) {
        // Silently handle errors for new streams that don't have indices yet
        return undefined;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const fieldTypes: FieldTypeInfo[] | undefined = useMemo(() => {
    if (!dataView) {
      return undefined;
    }
    return dataView.fields.map((field) => ({
      name: field.name,
      type: field.type,
      esType: field.esTypes?.[0],
    }));
  }, [dataView]);

  const fieldTypeMap = useMemo(() => {
    const typeMap = new Map<string, string>();
    if (fieldTypes) {
      fieldTypes.forEach((field) => {
        const fieldType = field.esType || field.type;
        if (fieldType) {
          typeMap.set(field.name, fieldType);
        }
      });
    }
    return typeMap;
  }, [fieldTypes]);

  return {
    fieldTypes,
    fieldTypeMap,
    isLoading,
    error,
    dataView,
  };
}
