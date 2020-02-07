/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { getOr, noop } from 'lodash/fp';

import { NetworkDnsTable } from '../../../components/page/network/network_dns_table';
import { NetworkDnsQuery, HISTOGRAM_ID } from '../../../containers/network_dns';
import { manageQuery } from '../../../components/page/manage_query';

import { NetworkComponentQueryProps } from './types';
import { networkModel } from '../../../store';

import { MatrixHistogramOption, HistogramType } from '../../../components/matrix_histogram/types';
import * as i18n from '../translations';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);

const dnsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'dns.question.registered_domain',
    value: 'dns.question.registered_domain',
  },
];

export const histogramConfigs = {
  defaultStackByOption: dnsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_DNS_DATA,
  histogramType: 'dns' as HistogramType,
  stackByOptions: dnsStackByOptions,
  subtitle: undefined,
  title: noop,
  updateDateRange: noop,
};

export const DnsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  skip,
  startDate,
  setQuery,
  type,
  updateDateRange = noop,
}: NetworkComponentQueryProps) => {
  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: HISTOGRAM_ID });
      }
    };
  }, [deleteQuery]);

  const getTitle = useCallback(
    (option: MatrixHistogramOption) => i18n.DOMAINS_COUNT_BY(option.text),
    []
  );

  const dnsHistogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      title: getTitle,
      updateDateRange,
    }),
    [getTitle, updateDateRange]
  );

  return (
    <>
      <MatrixHistogramContainer
        endDate={endDate}
        filterQuery={filterQuery}
        id={HISTOGRAM_ID}
        setQuery={setQuery}
        showLegend={true}
        sourceId="default"
        startDate={startDate}
        type={networkModel.NetworkType.page}
        {...dnsHistogramConfigs}
      />
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
};

DnsQueryTabBody.displayName = 'DNSQueryTabBody';
