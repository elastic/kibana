/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getESQLTimeFieldFromQuery } from '@kbn/esql-utils';
import type { ISearchGeneric } from '@kbn/search-types';
import { useDataFields } from '../../form/hooks/use_data_fields';
import { isDateLikeFieldType } from '../../form/utils';
import { ruleFormKeys } from '../../form/hooks/query_key_factory';
import { extractFromSourceQuery } from './extract_from_source_query';

interface UseResolveTimeFieldParams {
  /** Full ES|QL query or FROM-only query used to resolve index date fields. */
  query: string;
  timeField: string;
  onTimeFieldChange?: (timeField: string) => void;
  http: HttpStart;
  dataViews: DataViewsPublicPluginStart;
  /**
   * When provided, ES|QL column introspection is used for field discovery instead
   * of the DataView field-caps API. Preferred for all ES|QL sources because it
   * reflects the actual schema the query will return; required for federated sources
   * that don't exist as Elasticsearch indices.
   */
  search?: ISearchGeneric;
  /** When false, skips field resolution and auto-correction. Defaults to true. */
  enabled?: boolean;
}

/**
 * Resolves the correct time field for an ES|QL rule by inspecting the source
 * index (FROM-only query). Falls back to the ES|QL timefield API when field
 * caps return no date fields. Auto-corrects `timeField` when it does not
 * exist on the index (e.g. default `@timestamp` on `kibana_sample_data_flights`).
 */
export const useResolveTimeField = ({
  query,
  timeField,
  onTimeFieldChange,
  http,
  dataViews,
  search,
  enabled = true,
}: UseResolveTimeFieldParams) => {
  const fromSourceQuery = useMemo(() => extractFromSourceQuery(query), [query]);
  const resolutionQuery = enabled ? fromSourceQuery : '';

  const { data: fieldMap, isLoading: isLoadingFields } = useDataFields({
    query: resolutionQuery,
    http,
    dataViews,
    search,
  });

  const dateFields = useMemo(
    () =>
      Object.values(fieldMap)
        .filter((f) => isDateLikeFieldType(f.type))
        .map((f) => f.name)
        .sort(),
    [fieldMap]
  );

  const needsApiTimeField =
    enabled && Boolean(fromSourceQuery) && !isLoadingFields && dateFields.length === 0;

  const { data: apiTimeField, isLoading: isLoadingApiTimeField } = useQuery({
    queryKey: ruleFormKeys.composeDiscoverApiTimeField(fromSourceQuery),
    queryFn: () => getESQLTimeFieldFromQuery({ query: fromSourceQuery, http }),
    enabled: needsApiTimeField,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const timeFieldOptions = useMemo(() => {
    if (dateFields.length > 0) {
      return dateFields.map((name) => ({ value: name, text: name }));
    }
    if (apiTimeField) {
      return [{ value: apiTimeField, text: apiTimeField }];
    }
    return [{ value: '@timestamp', text: '@timestamp' }];
  }, [dateFields, apiTimeField]);

  const isTimeFieldResolved = useMemo(() => {
    if (!enabled || !fromSourceQuery) {
      return true;
    }
    if (isLoadingFields || (needsApiTimeField && isLoadingApiTimeField)) {
      return false;
    }
    // Any field that exists on the index is valid — auto-correction only fires when
    // the current field is absent, so membership is the right check here (not equality
    // with dateFields[0], which is alphabetically first, not necessarily canonical).
    if (dateFields.length > 0) {
      return dateFields.includes(timeField);
    }
    if (apiTimeField) {
      return timeField === apiTimeField;
    }
    // Neither field-caps nor the API fallback found a date field; the correction
    // effect will reset to '@timestamp'. Report resolved only once that matches.
    return timeField === '@timestamp';
  }, [
    enabled,
    fromSourceQuery,
    isLoadingFields,
    needsApiTimeField,
    isLoadingApiTimeField,
    dateFields,
    apiTimeField,
    timeField,
  ]);

  useEffect(() => {
    if (!enabled || !onTimeFieldChange || !fromSourceQuery) {
      return;
    }
    if (isLoadingFields || (needsApiTimeField && isLoadingApiTimeField)) {
      return;
    }
    if (dateFields.length > 0 && !dateFields.includes(timeField)) {
      onTimeFieldChange(dateFields[0]);
    } else if (apiTimeField && timeField !== apiTimeField) {
      onTimeFieldChange(apiTimeField);
    } else if (dateFields.length === 0 && !apiTimeField && timeField !== '@timestamp') {
      onTimeFieldChange('@timestamp');
    }
  }, [
    enabled,
    fromSourceQuery,
    dateFields,
    apiTimeField,
    timeField,
    onTimeFieldChange,
    isLoadingFields,
    needsApiTimeField,
    isLoadingApiTimeField,
  ]);

  return {
    timeFieldOptions,
    isTimeFieldResolved,
  };
};
