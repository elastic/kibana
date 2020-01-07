/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../components/page/manage_query';
import { TlsQuery } from '../../../containers/tls';
import { TlsTable } from '../../../components/page/network/tls_table';
import { TlsQueryTabBodyProps } from './types';

const TlsTableManage = manageQuery(TlsTable);

export const TlsQueryTabBody = ({
  endDate,
  filterQuery,
  flowTarget,
  ip = '',
  setQuery,
  skip,
  startDate,
  type,
}: TlsQueryTabBodyProps) => (
  <TlsQuery
    endDate={endDate}
    filterQuery={filterQuery}
    flowTarget={flowTarget}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({ id, inspect, isInspected, tls, totalCount, pageInfo, loading, loadPage, refetch }) => (
      <TlsTableManage
        data={tls}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        id={id}
        inspect={inspect}
        isInspect={isInspected}
        loading={loading}
        loadPage={loadPage}
        refetch={refetch}
        setQuery={setQuery}
        showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
        totalCount={totalCount}
        type={type}
      />
    )}
  </TlsQuery>
);
