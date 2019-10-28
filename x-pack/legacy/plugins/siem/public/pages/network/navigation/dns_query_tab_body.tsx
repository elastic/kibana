/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { EuiSpacer } from '@elastic/eui';
import { ScaleType } from '@elastic/charts';
import { NetworkDnsTable } from '../../../components/page/network/network_dns_table';
import { NetworkDnsQuery } from '../../../containers/network_dns';
import { manageQuery } from '../../../components/page/manage_query';

import { DnsQueryTabBodyProps } from './types';
import { MatrixHistogram } from '../../../components/matrix_over_time';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);
const NetworkDnsHistogramManage = manageQuery(MatrixHistogram);

export const DnsQueryTabBody = ({
  to,
  filterQuery,
  isInitializing,
  from,
  setQuery,
  type,
  updateDateRange = () => {},
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
      histogram,
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
      <>
        <NetworkDnsHistogramManage
          id={id}
          loading={loading}
          data={histogram}
          dataKey="histogram"
          endDate={to}
          startDate={from}
          title="DNS bytes out by domain"
          refetch={refetch}
          setQuery={setQuery}
          scaleType={ScaleType.Ordinal}
          totalCount={totalCount}
          updateDateRange={updateDateRange}
        />
        <EuiSpacer />
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
      </>
    )}
  </NetworkDnsQuery>
);

DnsQueryTabBody.displayName = 'DNSQueryTabBody';
