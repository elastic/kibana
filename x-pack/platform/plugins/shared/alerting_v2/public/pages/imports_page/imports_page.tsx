/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { UserCapabilities } from '../../services/user_capabilities';
import { ImportsTable, type ImportsTableChange } from '../../components/imports/imports_table';
import { useFetchImports } from '../../hooks/use_fetch_imports';

const IMPORTS_PAGE_TITLE = i18n.translate('xpack.alertingV2.imports.pageTitle', {
  defaultMessage: 'Import alerts',
});

const SEARCH_DEBOUNCE_MS = 300;

const INITIAL_TABLE_STATE: ImportsTableChange = {
  pageIndex: 0,
  pageSize: 25,
  sortField: 'name',
  sortOrder: 'asc',
};

/** Lists the alert imports of the current space. */
export const ImportsPage = () => {
  const [tableState, setTableState] = useState(INITIAL_TABLE_STATE);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const { capabilities } = useService(CoreStart('application'));
  // Deleting an import also deletes its connector, as the same user.
  const canDelete =
    useService(UserCapabilities).canWrite('alerts') && capabilities.actions?.delete === true;

  useDebounce(() => setSearch(searchText.trim()), SEARCH_DEBOUNCE_MS, [searchText]);

  const onSearchChange = useCallback((text: string) => {
    setSearchText(text);
    setTableState((state) => ({ ...state, pageIndex: 0 }));
  }, []);

  const { pageIndex, pageSize, sortField, sortOrder } = tableState;
  const { data, isLoading, error } = useFetchImports({
    page: pageIndex + 1,
    perPage: pageSize,
    search: search || undefined,
    sortField,
    sortOrder,
  });

  return (
    <div data-test-subj="alertingV2ImportsPage">
      <AppHeader title={IMPORTS_PAGE_TITLE} spacing="bleed" />
      <EuiSpacer size="m" />
      <ImportsTable
        items={data?.items ?? []}
        totalItemCount={data?.total ?? 0}
        isLoading={isLoading}
        error={error}
        pageIndex={pageIndex}
        pageSize={pageSize}
        sortField={sortField}
        sortOrder={sortOrder}
        searchText={searchText}
        canDelete={canDelete}
        onSearchChange={onSearchChange}
        onTableChange={setTableState}
      />
    </div>
  );
};
