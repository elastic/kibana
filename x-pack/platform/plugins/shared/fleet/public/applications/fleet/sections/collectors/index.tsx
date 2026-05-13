/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import type { CriteriaWithPagination } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { OtelCollector } from '../../../../../common/types/rest_spec/otel_collector';
import { useGetOtelCollectorsQuery } from '../../../../hooks/use_request/otel_collectors';
import { FLEET_ROUTING_PATHS } from '../../constants';
import { DefaultLayout } from '../../layouts';
import { useBreadcrumbs } from '../../hooks';

import { CollectorsTable } from './components/collectors_table';
import { CollectorsStatusBar } from './components/collectors_status_bar';

const DEFAULT_PAGE_SIZE = 20;
const REFRESH_INTERVAL_MS = 30000;

const CollectorsListPage: React.FC = () => {
  useBreadcrumbs('collectors');

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isAutoRefreshOn, setIsAutoRefreshOn] = useState(true);

  const { data, isLoading, isInitialLoading, isError, error, dataUpdatedAt } =
    useGetOtelCollectorsQuery(
      {
        page: pageIndex + 1,
        perPage: pageSize,
        showInactive: false,
      },
      {
        refetchInterval: isAutoRefreshOn ? REFRESH_INTERVAL_MS : false,
      }
    );

  const collectors = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const onTableChange = useCallback((criteria: CriteriaWithPagination<OtelCollector>) => {
    setPageIndex(criteria.page.index);
    setPageSize(criteria.page.size);
  }, []);

  return (
    <DefaultLayout section="collectors">
      <EuiSpacer size="m" />
      {isError ? (
        <EuiCallOut
          color="danger"
          iconType="error"
          title={
            <FormattedMessage
              id="xpack.fleet.collectors.errorTitle"
              defaultMessage="Unable to load collectors"
            />
          }
        >
          {error instanceof Error ? error.message : undefined}
        </EuiCallOut>
      ) : !isInitialLoading && collectors.length === 0 ? (
        <EuiEmptyPrompt
          iconType="compute"
          title={
            <FormattedMessage
              id="xpack.fleet.collectors.emptyTitle"
              defaultMessage="No collectors enrolled"
            />
          }
          body={
            <FormattedMessage
              id="xpack.fleet.collectors.emptyBody"
              defaultMessage="There are no OTel collectors enrolled yet."
            />
          }
        />
      ) : (
        <>
          <CollectorsStatusBar
            totalCount={totalCount}
            dataUpdatedAt={dataUpdatedAt}
            isAutoRefreshOn={isAutoRefreshOn}
            onAutoRefreshChange={setIsAutoRefreshOn}
          />
          <EuiSpacer size="m" />
          <CollectorsTable
            collectors={collectors}
            isLoading={isLoading}
            totalCount={totalCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onTableChange={onTableChange}
          />
        </>
      )}
    </DefaultLayout>
  );
};

export const CollectorsApp: React.FunctionComponent = () => {
  return (
    <Routes>
      <Route path={FLEET_ROUTING_PATHS.collectors}>
        <CollectorsListPage />
      </Route>
    </Routes>
  );
};
