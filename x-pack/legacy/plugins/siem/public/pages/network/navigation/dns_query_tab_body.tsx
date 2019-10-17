/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkDnsTable } from '../../../components/page/network/network_dns_table';
import { NetworkDnsQuery } from '../../../containers/network_dns';
import { manageQuery } from '../../../components/page/manage_query';

import { DnsQueryTabBodyProps } from './types';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);

export const DnsQueryTabBody = ({
  to,
  filterQuery,
  isInitializing,
  from,
  setQuery,
  type,
}: DnsQueryTabBodyProps) => (
  <NetworkDnsQuery
    endDate={to}
    filterQuery={filterQuery}
    skip={isInitializing}
    sourceId="default"
    startDate={from}
    type={type}
  >
    {({
      totalCount,
      loading,
      networkDns,
      pageInfo,
      loadPage,
      id,
      inspect,
      isInspected,
      refetch,
    }) => (
      <NetworkDnsTableManage
        data={networkDns}
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
  </NetworkDnsQuery>
);

DnsQueryTabBody.displayName = 'DNSQueryTabBody';
