/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

export interface FieldTypeInfo {
  name: string;
  type: string;
  esType?: string;
}

/**
 * Fetches DataView field types for a stream.
 *
 * @param streamName - The name of the stream to fetch field types for
 * @returns Object containing field types map and DataView
 */
export function useStreamDataViewFieldTypes(streamName: string) {
  const { dependencies } = useKibana();
  const { data } = dependencies.start;

  const { value: dataView } = useAbortableAsync(
    async ({ signal }) => {
      try {
        return await data.dataViews.create(
          {
            title: streamName,
            timeFieldName: '@timestamp',
          },
          undefined,
          false
        );
      } catch (err) {
        // Silently handle errors for new streams that don't have indices yet
        return undefined;
      }
    },
    [data.dataViews, streamName]
  );

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
    dataView,
  };
}
