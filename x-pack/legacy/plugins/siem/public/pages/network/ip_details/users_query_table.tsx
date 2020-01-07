/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../components/page/manage_query';
import { UsersQuery } from '../../../containers/users';
import { NetworkComponentsQueryProps } from './types';
import { UsersTable } from '../../../components/page/network/users_table';

const UsersTableManage = manageQuery(UsersTable);

export const UsersQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: NetworkComponentsQueryProps) => (
  <UsersQuery
    endDate={endDate}
    filterQuery={filterQuery}
    flowTarget={flowTarget}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({ id, inspect, isInspected, users, totalCount, pageInfo, loading, loadPage, refetch }) => (
      <UsersTableManage
        data={users}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        flowTarget={flowTarget}
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
  </UsersQuery>
);

UsersQueryTable.displayName = 'UsersQueryTable';
