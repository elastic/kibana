/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { EuiSearchBarOnChangeArgs, EuiSearchBarProps } from '@elastic/eui';
import {
  getDefaultTableOptions,
  useSessionPagination,
} from '../../../assistant/common/components/assistant_settings_management/pagination/use_session_pagination';
import { ContextEditorRow, FIELDS } from '../../../data_anonymization_editor/context_editor/types';
import { ANONYMIZATION_TABLE_SESSION_STORAGE_KEY } from '../../../assistant_context/constants';
import {
  QUERY_ALL,
  useFetchAnonymizationFields,
} from '../../../assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import {
  ALLOWED,
  ANONYMIZED,
} from '../../../data_anonymization_editor/context_editor/translations';

export const SEARCH: EuiSearchBarProps = {
  box: {
    incremental: true,
  },
  filters: [
    {
      field: FIELDS.ALLOWED,
      type: 'is',
      name: ALLOWED,
    },
    {
      field: FIELDS.ANONYMIZED,
      type: 'is',
      name: ANONYMIZED,
    },
  ],
};

export const useTable = (nameSpace: string) => {
  const defaultTableOptions = useMemo(() => {
    return getDefaultTableOptions<ContextEditorRow>({
      pageSize: 10,
      sortDirection: 'asc',
      sortField: 'field',
    });
  }, []);

  const { onTableChange, pagination, sorting } = useSessionPagination<ContextEditorRow, false>({
    defaultTableOptions,
    nameSpace,
    storageKey: ANONYMIZATION_TABLE_SESSION_STORAGE_KEY,
    inMemory: false,
  });

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback(
    (query: EuiSearchBarOnChangeArgs) => {
      setSearchQuery(query.queryText || '');
    },
    [setSearchQuery]
  );

  const { data: anonymizationPageFields, refetch: refetchPage } = useFetchAnonymizationFields({
    page: pagination.pageIndex, // EUI uses 0-based index, while API uses 1-based index
    perPage: pagination.pageSize, // Continue use in-memory paging till the new design will be ready
    sortField: sorting.sort?.field,
    sortOrder: sorting.sort?.direction,
    filter: searchQuery,
  });

  const { data: anonymizationAllFields, refetch: refetchAll } = useFetchAnonymizationFields({
    page: QUERY_ALL.page, // EUI uses 0-based index, while API uses 1-based index
    perPage: QUERY_ALL.perPage, // Continue use in-memory paging till the new design will be ready
    sortField: sorting.sort?.field,
    sortOrder: sorting.sort?.direction,
  });

  return {
    anonymizationPageFields,
    anonymizationAllFields,
    onTableChange,
    pagination,
    sorting,
    searchQuery,
    handleSearch,
    refetchAll,
    refetchPage,
  };
};
