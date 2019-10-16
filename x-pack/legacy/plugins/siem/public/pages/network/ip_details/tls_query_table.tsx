/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { manageQuery } from '../../../components/page/manage_query';
import { TlsTable } from '../../../components/page/network/tls_table';
import { TlsQuery } from '../../../containers/tls';
import { TlsQueryTableComponentProps } from './types';

const TlsTableManage = manageQuery(TlsTable);

export const TlsQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: TlsQueryTableComponentProps) => (
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
        id={id}
        inspect={inspect}
        isInspect={isInspected}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        loading={loading}
        loadPage={loadPage}
        showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
        refetch={refetch}
        setQuery={setQuery}
        totalCount={totalCount}
        type={type}
      />
    )}
  </TlsQuery>
);

TlsQueryTable.displayName = 'TlsQueryTable';
