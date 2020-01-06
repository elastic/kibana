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
import { NetworkDnsQuery, NetworkDnsHistogramQuery } from '../../../containers/network_dns';
import { manageQuery } from '../../../components/page/manage_query';

import { NetworkComponentQueryProps } from './types';
import { networkModel } from '../../../store';
import { SignalsHistogramOption } from '../../../components/matrix_histogram/types';
import { networkDnsQuery } from '../../../containers/network_dns/index.gql_query';
import { bytesFormatter } from '../../../components/matrix_histogram/utils';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);

const dnsStackByOptions: SignalsHistogramOption[] = [
  {
    text: 'domain',
    value: 'dns.question.registered_domain',
  },
];

export const DnsQueryTabBody = ({
  endDate,
  filterQuery,
  skip,
  startDate,
  setQuery,
  type,
  updateDateRange = () => {},
}: NetworkComponentQueryProps) => (
  <>
    <NetworkDnsHistogramQuery
      dataKey={['NetworkDns', 'histogram']}
      defaultStackByOption={dnsStackByOptions[0]}
      endDate={endDate}
      filterQuery={filterQuery}
      query={networkDnsQuery}
      scaleType={ScaleType.Ordinal}
      sourceId="default"
      startDate={startDate}
      stackByOptions={dnsStackByOptions}
      title="DNS"
      type={networkModel.NetworkType.page}
      updateDateRange={updateDateRange}
      yTickFormatter={bytesFormatter}
      showLegend={false}
    />
    <EuiSpacer />
    <NetworkDnsQuery
      endDate={endDate}
      filterQuery={filterQuery}
      skip={skip}
      sourceId="default"
      startDate={startDate}
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
