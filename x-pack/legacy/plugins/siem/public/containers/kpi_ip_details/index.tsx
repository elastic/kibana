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
import { GetKpiIpDetailsQuery, KpiIpDetailsData } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiIpDetailsQuery } from './index.gql_query';

export interface KpiIpDetailsArgs {
  id: string;
  kpiIpDetails: KpiIpDetailsData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface KpiIpDetailsProps extends QueryTemplateProps {
  children: (args: KpiIpDetailsArgs) => React.ReactNode;
}

export const KpiIpDetailsQuery = React.memo<KpiIpDetailsProps>(
  ({ id = 'kpiIpDetailsQuery', children, filterQuery, sourceId, startDate, endDate }) => (
    <Query<GetKpiIpDetailsQuery.Query, GetKpiIpDetailsQuery.Variables>
      query={kpiIpDetailsQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
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
        const kpiIpDetails = getOr({}, `source.KpiIpDetails`, data);
        return children({
          id,
          kpiIpDetails,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
