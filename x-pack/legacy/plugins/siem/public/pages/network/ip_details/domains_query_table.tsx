/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { manageQuery } from '../../../components/page/manage_query';
import { DomainsQuery } from '../../../containers/domains';
import { DomainsTable } from '../../../components/page/network/domains_table';

import { DomainsQueryTableProps } from './types';

const DomainsTableManage = manageQuery(DomainsTable);

export const DomainsQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
  indexPattern,
}: DomainsQueryTableProps) => (
  <DomainsQuery
    endDate={endDate}
    filterQuery={filterQuery}
    flowTarget={flowTarget}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({ id, inspect, isInspected, domains, totalCount, pageInfo, loading, loadPage, refetch }) => (
      <DomainsTableManage
        data={domains}
        indexPattern={indexPattern}
        id={id}
        inspect={inspect}
        flowTarget={flowTarget}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        ip={ip}
        isInspect={isInspected}
        loading={loading}
        loadPage={loadPage}
        showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
        refetch={refetch}
        setQuery={setQuery}
        totalCount={totalCount}
        type={type}
      />
    )}
  </DomainsQuery>
);
