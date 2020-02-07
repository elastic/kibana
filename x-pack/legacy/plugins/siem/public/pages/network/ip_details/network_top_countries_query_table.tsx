/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../components/page/manage_query';
import { NetworkWithIndexComponentsQueryTableProps } from './types';
import { NetworkTopCountriesQuery } from '../../../containers/network_top_countries';
import { NetworkTopCountriesTable } from '../../../components/page/network/network_top_countries_table';

const NetworkTopCountriesTableManage = manageQuery(NetworkTopCountriesTable);

export const NetworkTopCountriesQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
  indexPattern,
}: NetworkWithIndexComponentsQueryTableProps) => (
  <NetworkTopCountriesQuery
    endDate={endDate}
    flowTarget={flowTarget}
    filterQuery={filterQuery}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
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
        type={type}
      />
    )}
  </NetworkTopCountriesQuery>
);

NetworkTopCountriesQueryTable.displayName = 'NetworkTopCountriesQueryTable';
