/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { EuiSpacer } from '@elastic/eui';
import { NetworkDnsTable } from '../../../components/page/network/network_dns_table';
import { NetworkDnsQuery, NetworkDnsHistogramQuery } from '../../../containers/network_dns';
import { manageQuery } from '../../../components/page/manage_query';

import { DnsQueryTabBodyProps } from './types';
import { NetworkDnsHistogram } from '../../../components/page/network/dns_histogram';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);
const NetworkDnsHistogramManage = manageQuery(NetworkDnsHistogram);

export const DnsQueryTabBody = ({
  to,
  filterQuery,
  isInitializing,
  from,
  setQuery,
  type,
  updateDateRange = () => {},
}: DnsQueryTabBodyProps) => (
  <>
    <NetworkDnsHistogramQuery
      endDate={to}
      filterQuery={filterQuery}
      skip={isInitializing}
      sourceId="default"
      startDate={from}
      type={type}
    >
      {({ totalCount, loading, id, inspect, refetch, histogram }) => (
        <NetworkDnsHistogramManage
          id={id}
          loading={loading}
          data={histogram}
          endDate={to}
          startDate={from}
          inspect={inspect}
          refetch={refetch}
          setQuery={setQuery}
          totalCount={totalCount}
          updateDateRange={updateDateRange}
        />
      )}
    </NetworkDnsHistogramQuery>
    <EuiSpacer />
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
        histogram,
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
  </>
);

DnsQueryTabBody.displayName = 'DNSQueryTabBody';
