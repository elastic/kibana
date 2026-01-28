/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableProps, EuiTableSelectionType } from '@elastic/eui';
import { PAGE_SIZE_OPTIONS } from './use_templates_pagination';
import type { QueryParams, Template } from './types';

const DEFAULT_QUERY_PARAMS: QueryParams = {
  page: 1,
  perPage: PAGE_SIZE_OPTIONS[0],
  sortField: 'name',
  sortOrder: 'asc',
  search: '',
};

export interface UseTemplatesStateReturnValue {
  queryParams: QueryParams;
  setQueryParams: (params: Partial<QueryParams>) => void;
  sorting: EuiBasicTableProps<Template>['sorting'];
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

  const sorting: EuiBasicTableProps<Template>['sorting'] = useMemo(
    () => ({
      sort: {
        field: queryParams.sortField,
        direction: queryParams.sortOrder,
      },
    }),
    [queryParams.sortField, queryParams.sortOrder]
  );

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
    sorting,
    selectedTemplates,
    selection,
    deselectTemplates,
  };
};
