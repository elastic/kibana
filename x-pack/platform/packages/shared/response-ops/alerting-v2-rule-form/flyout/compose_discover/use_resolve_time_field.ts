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
import { getESQLTimeField } from '@kbn/esql-utils';
import { resolveTimeField } from '@kbn/alerting-v2-utils';
import { useDataFields } from '../../form/hooks/use_data_fields';
import { ruleFormKeys } from '../../form/hooks/query_key_factory';
import { extractFromSourceQuery } from './extract_from_source_query';

interface UseResolveTimeFieldParams {
  /** Full ES|QL query or FROM-only query used to resolve index date fields. */
  query: string;
  timeField: string;
  onTimeFieldChange?: (timeField: string) => void;
  http: HttpStart;
  dataViews: DataViewsPublicPluginStart;
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
  enabled = true,
}: UseResolveTimeFieldParams) => {
  const fromSourceQuery = useMemo(() => extractFromSourceQuery(query), [query]);
  const resolutionQuery = enabled ? fromSourceQuery : '';

  const { data: fieldMap, isLoading: isLoadingFields } = useDataFields({
    query: resolutionQuery,
    http,
    dataViews,
  });

  const dateFields = useMemo(
    () =>
      Object.values(fieldMap)
        .filter((f) => f.type === 'date')
        .map((f) => f.name)
        .sort(),
    [fieldMap]
  );

  const needsApiTimeField =
    enabled && Boolean(fromSourceQuery) && !isLoadingFields && dateFields.length === 0;

  const { data: apiTimeField, isLoading: isLoadingApiTimeField } = useQuery({
    queryKey: ruleFormKeys.composeDiscoverApiTimeField(fromSourceQuery),
    queryFn: () => getESQLTimeField({ query: fromSourceQuery, http }),
    enabled: needsApiTimeField,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Candidate date fields: field caps when available, otherwise the single
  // field the ES|QL API inferred from the query.
  const candidateDateFields = useMemo(
    () => (dateFields.length > 0 ? dateFields : apiTimeField ? [apiTimeField] : []),
    [dateFields, apiTimeField]
  );

  const resolvedTimeField = useMemo(
    () => resolveTimeField({ dateFields: candidateDateFields, currentTimeField: timeField }),
    [candidateDateFields, timeField]
  );

  const isLoadingResolution = isLoadingFields || (needsApiTimeField && isLoadingApiTimeField);

  const timeFieldOptions = useMemo(() => {
    if (dateFields.length > 0) {
      return dateFields.map((name) => ({ value: name, text: name }));
    }
    if (apiTimeField) {
      return [{ value: apiTimeField, text: apiTimeField }];
    }
    // No date field on the index: don't fabricate `@timestamp`. Callers show a
    // placeholder/invalid state so the user must select (or fix the query).
    return [];
  }, [dateFields, apiTimeField]);

  const isTimeFieldResolved = useMemo(() => {
    if (!enabled || !fromSourceQuery) {
      return true;
    }
    if (isLoadingResolution) {
      return false;
    }
    return timeField === resolvedTimeField;
  }, [enabled, fromSourceQuery, isLoadingResolution, resolvedTimeField, timeField]);

  useEffect(() => {
    if (!enabled || !onTimeFieldChange || !fromSourceQuery || isLoadingResolution) {
      return;
    }
    // Sync the form value to the resolved field. `null` (no resolvable date field
    // on the index, or the current selection isn't valid) clears the value —
    // never fabricate `@timestamp` — so the user is forced to pick and the empty
    // value can be flagged downstream.
    const nextTimeField = resolvedTimeField ?? '';
    if (nextTimeField !== timeField) {
      onTimeFieldChange(nextTimeField);
    }
  }, [
    enabled,
    fromSourceQuery,
    isLoadingResolution,
    resolvedTimeField,
    timeField,
    onTimeFieldChange,
  ]);

  return {
    timeFieldOptions,
    isTimeFieldResolved,
  };
};
