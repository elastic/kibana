/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { HostsQuery } from '../../../containers/hosts';
import { HostsComponentsQueryProps } from './types';
import { HostsTable } from '../../../components/page/hosts';
import { manageQuery } from '../../../components/page/manage_query';

const HostsTableManage = manageQuery(HostsTable);

export const HostsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexPattern,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => (
  <HostsQuery
    endDate={endDate}
    filterQuery={filterQuery}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({ hosts, totalCount, loading, pageInfo, loadPage, id, inspect, isInspected, refetch }) => (
      <HostsTableManage
        deleteQuery={deleteQuery}
        data={hosts}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        id={id}
        indexPattern={indexPattern}
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
  </HostsQuery>
);

HostsQueryTabBody.displayName = 'HostsQueryTabBody';
