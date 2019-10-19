/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { AuthenticationTable } from '../../../components/page/hosts/authentications_table';
import { manageQuery } from '../../../components/page/manage_query';
import { AuthenticationsQuery } from '../../../containers/authentications';
import { HostsComponentsQueryProps } from './types';

const AuthenticationTableManage = manageQuery(AuthenticationTable);

export const AuthenticationsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => (
  <AuthenticationsQuery
    endDate={endDate}
    filterQuery={filterQuery}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({
      authentications,
      totalCount,
      loading,
      pageInfo,
      loadPage,
      id,
      inspect,
      isInspected,
      refetch,
    }) => (
      <AuthenticationTableManage
        data={authentications}
        deleteQuery={deleteQuery}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        id={id}
        inspect={inspect}
        isInspect={isInspected}
        loading={loading}
        loadPage={loadPage}
        refetch={refetch}
        showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
        setQuery={setQuery}
        totalCount={totalCount}
        type={type}
      />
    )}
  </AuthenticationsQuery>
);

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
