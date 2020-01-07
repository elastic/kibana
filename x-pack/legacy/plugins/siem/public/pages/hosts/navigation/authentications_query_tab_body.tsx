/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AuthenticationTable } from '../../../components/page/hosts/authentications_table';
import { manageQuery } from '../../../components/page/manage_query';
import { AuthenticationsOverTimeHistogram } from '../../../components/page/hosts/authentications_over_time';
import { AuthenticationsOverTimeQuery } from '../../../containers/authentications/authentications_over_time';
import { AuthenticationsQuery } from '../../../containers/authentications';
import { HostsComponentsQueryProps } from './types';
import { hostsModel } from '../../../store/hosts';

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const AuthenticationsOverTimeManage = manageQuery(AuthenticationsOverTimeHistogram);

export const AuthenticationsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
  updateDateRange = () => {},
}: HostsComponentsQueryProps) => (
  <>
    <AuthenticationsOverTimeQuery
      endDate={endDate}
      filterQuery={filterQuery}
      sourceId="default"
      startDate={startDate}
      type={hostsModel.HostsType.page}
    >
      {({ authenticationsOverTime, loading, id, inspect, refetch, totalCount }) => (
        <AuthenticationsOverTimeManage
          data={authenticationsOverTime!}
          endDate={endDate}
          id={id}
          inspect={inspect}
          loading={loading}
          refetch={refetch}
          setQuery={setQuery}
          startDate={startDate}
          totalCount={totalCount}
          updateDateRange={updateDateRange}
        />
      )}
    </AuthenticationsOverTimeQuery>
    <EuiSpacer size="l" />
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
          setQuery={setQuery}
          showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
          totalCount={totalCount}
          type={type}
        />
      )}
    </AuthenticationsQuery>
  </>
);

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
