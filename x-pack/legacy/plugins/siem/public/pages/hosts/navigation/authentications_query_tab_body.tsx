/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AuthenticationTable } from '../../../components/page/hosts/authentications_table';
import { manageQuery } from '../../../components/page/manage_query';
import { AuthenticationsQuery } from '../../../containers/authentications';
import { HostsComponentsQueryProps } from './types';
import { hostsModel } from '../../../store/hosts';
import {
  MatrixHistogramOption,
  MatrixHistogramMappingTypes,
} from '../../../components/matrix_histogram/types';
import { MatrixHistogramContainer } from '../../../containers/matrix_histogram';
import { KpiHostsChartColors } from '../../../components/page/hosts/kpi_hosts/types';
import { MatrixHistogramGqlQuery } from '../../../containers/matrix_histogram/index.gql_query';
import * as i18n from '../translations';

const AuthenticationTableManage = manageQuery(AuthenticationTable);
const ID = 'authenticationsOverTimeQuery';
const authStackByOptions: MatrixHistogramOption[] = [
  {
    text: i18n.NAVIGATION_AUTHENTICATIONS_STACK_BY_EVENT_TYPE,
    value: 'event.type',
  },
];

enum AuthMatrixDataGroup {
  authSuccess = 'authentication_success',
  authFailure = 'authentication_failure',
}

export const authMatrixDataMappingFields: MatrixHistogramMappingTypes = {
  [AuthMatrixDataGroup.authSuccess]: {
    key: AuthMatrixDataGroup.authSuccess,
    value: null,
    color: KpiHostsChartColors.authSuccess,
  },
  [AuthMatrixDataGroup.authFailure]: {
    key: AuthMatrixDataGroup.authFailure,
    value: null,
    color: KpiHostsChartColors.authFailure,
  },
};

export const AuthenticationsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  skip,
  setQuery,
  startDate,
  type,
  updateDateRange = () => {},
}: HostsComponentsQueryProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);
  return (
    <>
      <MatrixHistogramContainer
        isAuthenticationsHistogram={true}
        dataKey="AuthenticationsHistogram"
        defaultStackByOption={authStackByOptions[0]}
        deleteQuery={deleteQuery}
        endDate={endDate}
        errorMessage={i18n.ERROR_FETCHING_AUTHENTICATIONS_DATA}
        filterQuery={filterQuery}
        id={ID}
        mapping={authMatrixDataMappingFields}
        query={MatrixHistogramGqlQuery}
        setQuery={setQuery}
        skip={skip}
        sourceId="default"
        startDate={startDate}
        stackByOptions={authStackByOptions}
        title={i18n.NAVIGATION_AUTHENTICATIONS_TITLE}
        type={hostsModel.HostsType.page}
        updateDateRange={updateDateRange}
      />
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
            showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
            setQuery={setQuery}
            totalCount={totalCount}
            type={type}
          />
        )}
      </AuthenticationsQuery>
    </>
  );
};

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
