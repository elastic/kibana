/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkTopCountriesTable } from '../../../components/page/network';
import { NetworkTopCountriesQuery } from '../../../containers/network_top_countries';
import { networkModel } from '../../../store';
import { manageQuery } from '../../../components/page/manage_query';

import { IPsQueryTabBodyProps as CountriesQueryTabBodyProps } from './types';

const NetworkTopCountriesTableManage = manageQuery(NetworkTopCountriesTable);

export const CountriesQueryTabBody = ({
  to,
  filterQuery,
  isInitializing,
  from,
  setQuery,
  indexPattern,
  flowTarget,
}: CountriesQueryTabBodyProps) => (
  <NetworkTopCountriesQuery
    endDate={to}
    flowTarget={flowTarget}
    filterQuery={filterQuery}
    skip={isInitializing}
    sourceId="default"
    startDate={from}
    type={networkModel.NetworkType.page}
  >
    {({
      id,
      inspect,
      isInspected,
      loading,
      loadPage,
      networkTopCountries,
      pageInfo,
      refetch,
      totalCount,
    }) => (
      <NetworkTopCountriesTableManage
        data={networkTopCountries}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        flowTargeted={flowTarget}
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
        type={networkModel.NetworkType.page}
      />
    )}
  </NetworkTopCountriesQuery>
);

CountriesQueryTabBody.displayName = 'CountriesQueryTabBody';
