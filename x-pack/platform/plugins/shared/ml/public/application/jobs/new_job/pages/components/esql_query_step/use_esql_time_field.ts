/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { useMlKibana } from '../../../../../contexts/kibana';
import { extractSourceQuery } from './extract_source_query';

const DEFAULT_TIME_FIELD = '@timestamp';
const DATE_FIELD_TYPES = new Set(['date', 'date_nanos', 'datetime']);
// wait for typing to pause before asking Elasticsearch for the query's columns
const COLUMNS_DEBOUNCE_MS = 500;

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
 * Lists the date columns the query returns and keeps the selected time field valid.
 * While the query can't be run, e.g. part way through typing, the last list is kept.
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
    services: { data },
  } = useMlKibana();
  const hasSourceQuery = useMemo(() => extractSourceQuery(query) !== '', [query]);
  const trimmedQuery = query.trim();
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hasSourceQuery) {
      setDateFields([]);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const columns = await getESQLQueryColumnsRaw({
          esqlQuery: trimmedQuery,
          search: data.search.search,
          signal: abortController.signal,
          projectRouting,
        });
        if (!abortController.signal.aborted) {
          setDateFields(
            columns
              .filter(({ type }) => DATE_FIELD_TYPES.has(type))
              .map(({ name }) => name)
              .sort()
          );
        }
      } catch {
        // the query is invalid or incomplete, so keep the previous columns
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, COLUMNS_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [hasSourceQuery, trimmedQuery, data.search.search, projectRouting]);

  useEffect(() => {
    if (!hasSourceQuery || isLoading) {
      return;
    }
    const nextTimeField = pickTimeField(dateFields, timeField);
    if (nextTimeField !== timeField) {
      onTimeFieldChange(nextTimeField);
    }
  }, [hasSourceQuery, isLoading, dateFields, timeField, onTimeFieldChange]);

  const timeFieldOptions = useMemo(
    () => dateFields.map((name) => ({ value: name, text: name })),
    [dateFields]
  );

  return { timeFieldOptions, hasSourceQuery, isLoading };
};
