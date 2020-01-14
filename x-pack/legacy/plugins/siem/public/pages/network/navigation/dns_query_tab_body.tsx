/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { getOr } from 'lodash/fp';

import { EuiSpacer } from '@elastic/eui';
import { ScaleType } from '@elastic/charts';
import { NetworkDnsTable } from '../../../components/page/network/network_dns_table';
import {
  NetworkDnsQuery,
  NetworkDnsHistogramQuery,
  HISTOGRAM_ID,
} from '../../../containers/network_dns';
import { manageQuery } from '../../../components/page/manage_query';

import { NetworkComponentQueryProps } from './types';
import { networkModel } from '../../../store';
import { MatrixHistogramOption } from '../../../components/matrix_histogram/types';
import { networkDnsQuery } from '../../../containers/network_dns/index.gql_query';
import * as i18n from '../translations';
import { useFormatBytes } from '../../../components/formatted_bytes';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);

const dnsStackByOptions: MatrixHistogramOption[] = [
  {
    text: i18n.NAVIGATION_DNS_STACK_BY_DOMAIN,
    value: 'dns.question.registered_domain',
  },
];

export const DnsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  skip,
  startDate,
  setQuery,
  type,
  updateDateRange = () => {},
}: NetworkComponentQueryProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);
  const formatBytes = useFormatBytes();

  return (
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
      }) => (
        <>
          <NetworkDnsHistogramQuery
            dataKey={['NetworkDns', 'histogram']}
            defaultStackByOption={dnsStackByOptions[0]}
            endDate={endDate}
            errorMessage={i18n.ERROR_FETCHING_DNS_DATA}
            filterQuery={filterQuery}
            isDNSHistogram={true}
            limit={totalCount}
            query={networkDnsQuery}
            scaleType={ScaleType.Ordinal}
            setQuery={setQuery}
            sourceId="default"
            startDate={startDate}
            stackByOptions={dnsStackByOptions}
            title={i18n.NAVIGATION_DNS_TITLE}
            type={networkModel.NetworkType.page}
            updateDateRange={updateDateRange}
            yTickFormatter={formatBytes}
            showLegend={false}
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
};

DnsQueryTabBody.displayName = 'DNSQueryTabBody';
