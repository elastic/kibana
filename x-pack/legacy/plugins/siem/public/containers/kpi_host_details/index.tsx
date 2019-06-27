/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { KpiHostDetailsData, GetKpiHostDetailsQuery } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiHostDetailsQuery } from './index.gql_query';

export interface KpiHostDetailsArgs {
  id: string;
  kpiHostDetails: KpiHostDetailsData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface QueryKpiHostDetailsProps extends QueryTemplateProps {
  children: (args: KpiHostDetailsArgs) => React.ReactNode;
}

export const KpiHostDetailsQuery = React.memo<QueryKpiHostDetailsProps>(
  ({ id = 'kpiHostDetailsQuery', children, endDate, filterQuery, skip, sourceId, startDate }) => (
    <Query<GetKpiHostDetailsQuery.Query, GetKpiHostDetailsQuery.Variables>
      query={kpiHostDetailsQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      skip={skip}
      variables={{
        sourceId,
        timerange: {
          interval: '12h',
          from: startDate!,
          to: endDate!,
        },
        filterQuery: createFilter(filterQuery),
        defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      }}
    >
      {({ data, loading, refetch }) => {
        const kpiHostDetails = getOr({}, `source.KpiHostDetails`, data);
        return children({
          id,
          kpiHostDetails,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
