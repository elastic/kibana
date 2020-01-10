/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkTopNFlowTable } from '../../../components/page/network';
import { NetworkTopNFlowQuery } from '../../../containers/network_top_n_flow';
import { networkModel } from '../../../store';
import { manageQuery } from '../../../components/page/manage_query';

import { IPsQueryTabBodyProps } from './types';

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);

export const IPsQueryTabBody = ({
  endDate,
  filterQuery,
  skip,
  startDate,
  setQuery,
  indexPattern,
  flowTarget,
}: IPsQueryTabBodyProps) => (
  <NetworkTopNFlowQuery
    endDate={endDate}
    flowTarget={flowTarget}
    filterQuery={filterQuery}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={networkModel.NetworkType.page}
  >
    {({
      id,
      inspect,
      isInspected,
      loading,
      loadPage,
      networkTopNFlow,
      pageInfo,
      refetch,
      totalCount,
    }) => (
      <NetworkTopNFlowTableManage
        data={networkTopNFlow}
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
  </NetworkTopNFlowQuery>
);

IPsQueryTabBody.displayName = 'IPsQueryTabBody';
