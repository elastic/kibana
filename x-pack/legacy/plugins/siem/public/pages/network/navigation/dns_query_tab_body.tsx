/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { getOr } from 'lodash/fp';

import { NetworkDnsTable } from '../../../components/page/network/network_dns_table';
import { NetworkDnsQuery, HISTOGRAM_ID } from '../../../containers/network_dns';
import { manageQuery } from '../../../components/page/manage_query';

import { NetworkComponentQueryProps } from './types';
import { networkModel } from '../../../store';

import {
  MatrixHistogramOption,
  MatrixHisrogramConfigs,
} from '../../../components/matrix_histogram/types';
import * as i18n from '../translations';
import { MatrixHistogramContainer } from '../../../components/matrix_histogram';
import { HistogramType } from '../../../graphql/types';

const NetworkDnsTableManage = manageQuery(NetworkDnsTable);

const dnsStackByOptions: MatrixHistogramOption[] = [
  {
    text: 'dns.question.registered_domain',
    value: 'dns.question.registered_domain',
  },
];

const DEFAULT_STACK_BY = 'dns.question.registered_domain';

export const histogramConfigs: Omit<MatrixHisrogramConfigs, 'title'> = {
  defaultStackByOption:
    dnsStackByOptions.find(o => o.text === DEFAULT_STACK_BY) ?? dnsStackByOptions[0],
  errorMessage: i18n.ERROR_FETCHING_DNS_DATA,
  histogramType: HistogramType.dns,
  stackByOptions: dnsStackByOptions,
  subtitle: undefined,
};

export const DnsQueryTabBody = ({
  deleteQuery,
  endDate,
  filterQuery,
  skip,
  startDate,
  setQuery,
  type,
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

  const dnsHistogramConfigs: MatrixHisrogramConfigs = useMemo(
    () => ({
      ...histogramConfigs,
      title: getTitle,
    }),
    [getTitle]
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
