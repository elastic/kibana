/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableProps, EuiTableSelectionType } from '@elastic/eui';
import type {
  TemplatesFindRequest,
  TemplateListItem,
} from '../../../../common/types/api/template/v1';
import { useSyncedQueryParams } from './use_synced_query_params';

interface UseTemplatesStateReturn {
  queryParams: TemplatesFindRequest;
  setQueryParams: (queryParam: Partial<TemplatesFindRequest>) => void;
  sorting: EuiBasicTableProps<TemplateListItem>['sorting'];
  selectedTemplates: TemplateListItem[];
  selection: EuiTableSelectionType<TemplateListItem>;
  deselectTemplates: () => void;
}

export const useTemplatesState = (): UseTemplatesStateReturn => {
  const [selectedTemplates, setSelectedTemplates] = useState<TemplateListItem[]>([]);
  const { queryParams, setQueryParams: setSyncedQueryParams } = useSyncedQueryParams();

  const setQueryParams = useCallback(
    (newQueryParams: Partial<TemplatesFindRequest>) => {
      setSyncedQueryParams(newQueryParams);
      setSelectedTemplates([]);
    },
    [setSyncedQueryParams]
  );

  const deselectTemplates = useCallback(() => {
    setSelectedTemplates([]);
  }, []);

  const sorting: EuiBasicTableProps<TemplateListItem>['sorting'] = useMemo(
    () => ({
      sort: {
        field: queryParams.sortField,
        direction: queryParams.sortOrder,
      },
    }),
    [queryParams.sortField, queryParams.sortOrder]
  );

  const selection: EuiTableSelectionType<TemplateListItem> = useMemo(
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
