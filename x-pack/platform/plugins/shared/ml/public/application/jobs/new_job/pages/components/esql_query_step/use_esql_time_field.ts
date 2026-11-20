/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { getESQLQueryColumnsRaw, getESQLTimeField } from '@kbn/esql-utils';
import { useMlKibana } from '../../../../../contexts/kibana';
import { extractSourceQuery } from './extract_source_query';

const DEFAULT_TIME_FIELD = '@timestamp';
const DATE_FIELD_TYPES = new Set(['date', 'date_nanos', 'datetime']);

export interface TimeFieldOption {
  value: string;
  text: string;
}

const pickTimeField = (dateFields: string[], currentTimeField: string): string => {
  if (currentTimeField && dateFields.includes(currentTimeField)) {
    return currentTimeField;
  }
  if (dateFields.includes(DEFAULT_TIME_FIELD)) {
    return DEFAULT_TIME_FIELD;
  }
  return dateFields[0] ?? '';
};

/**
 * Lists the date fields of the query's source and keeps the selected time field valid,
 * falling back to the ES|QL time field API when the source has no date columns.
 */
export const useEsqlTimeField = ({
  query,
  timeField,
  onTimeFieldChange,
  projectRouting,
}: {
  query: string;
  timeField: string;
  onTimeFieldChange: (timeField: string) => void;
  projectRouting?: string;
}): { timeFieldOptions: TimeFieldOption[]; hasSourceQuery: boolean; isLoading: boolean } => {
  const {
    services: { data, http },
  } = useMlKibana();
  const sourceQuery = useMemo(() => extractSourceQuery(query), [query]);
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!sourceQuery) {
      setDateFields([]);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);

    const loadDateFields = async (): Promise<string[]> => {
      try {
        const columns = await getESQLQueryColumnsRaw({
          esqlQuery: sourceQuery,
          search: data.search.search,
          signal: abortController.signal,
          projectRouting,
        });
        const fields = columns
          .filter(({ type }) => DATE_FIELD_TYPES.has(type))
          .map(({ name }) => name)
          .sort();
        if (fields.length > 0) {
          return fields;
        }
      } catch {
        // Fall through to the time field API below.
      }
      const apiTimeField = await getESQLTimeField({ query: sourceQuery, http, projectRouting });
      return apiTimeField ? [apiTimeField] : [];
    };

    loadDateFields()
      .then((fields) => {
        if (!abortController.signal.aborted) {
          setDateFields(fields);
        }
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setDateFields([]);
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [sourceQuery, data.search.search, http, projectRouting]);

  useEffect(() => {
    if (!sourceQuery || isLoading) {
      return;
    }
    const nextTimeField = pickTimeField(dateFields, timeField);
    if (nextTimeField !== timeField) {
      onTimeFieldChange(nextTimeField);
    }
  }, [sourceQuery, isLoading, dateFields, timeField, onTimeFieldChange]);

  const timeFieldOptions = useMemo(
    () => dateFields.map((name) => ({ value: name, text: name })),
    [dateFields]
  );

  return { timeFieldOptions, hasSourceQuery: sourceQuery !== '', isLoading };
};
