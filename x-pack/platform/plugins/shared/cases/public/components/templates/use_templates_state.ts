/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { EuiTableSelectionType } from '@elastic/eui';
import type { Template } from './sample_data';
import { PAGE_SIZE_OPTIONS } from './use_templates_pagination';

const DEFAULT_QUERY_PARAMS: QueryParams = {
  page: 1,
  perPage: PAGE_SIZE_OPTIONS[0],
};

export interface QueryParams {
  page: number;
  perPage: number;
}

export interface UseTemplatesStateReturnValue {
  queryParams: QueryParams;
  setQueryParams: (params: Partial<QueryParams>) => void;
  selectedTemplates: Template[];
  selection: EuiTableSelectionType<Template>;
  deselectTemplates: () => void;
}

export const useTemplatesState = (): UseTemplatesStateReturnValue => {
  const [queryParams, setQueryParamsState] = useState<QueryParams>(DEFAULT_QUERY_PARAMS);
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);

  const setQueryParams = useCallback((newParams: Partial<QueryParams>) => {
    setQueryParamsState((prev) => ({ ...prev, ...newParams }));
    setSelectedTemplates([]);
  }, []);

  const deselectTemplates = useCallback(() => {
    setSelectedTemplates([]);
  }, []);

  const selection: EuiTableSelectionType<Template> = useMemo(
    () => ({
      onSelectionChange: setSelectedTemplates,
      selected: selectedTemplates,
    }),
    [selectedTemplates]
  );

  return {
    queryParams,
    setQueryParams,
    selectedTemplates,
    selection,
    deselectTemplates,
  };
};
