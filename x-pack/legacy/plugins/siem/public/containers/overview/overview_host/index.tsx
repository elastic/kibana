/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { GetOverviewHostQuery, OverviewHostData } from '../../../graphql/types';
import { inputsModel } from '../../../store/inputs';
import { createFilter } from '../../helpers';
import { QueryTemplateProps } from '../../query_template';

import { overviewHostQuery } from './index.gql_query';

export interface OverviewHostArgs {
  id: string;
  overviewHost: OverviewHostData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OverviewHostProps extends QueryTemplateProps {
  children: (args: OverviewHostArgs) => React.ReactNode;
  sourceId: string;
  endDate: number;
  startDate: number;
}

export const OverviewHostQuery = pure<OverviewHostProps>(
  ({ id = 'overviewHostQuery', children, filterQuery, sourceId, startDate, endDate }) => (
    <Query<GetOverviewHostQuery.Query, GetOverviewHostQuery.Variables>
      query={overviewHostQuery}
      fetchPolicy="cache-and-network"
      variables={{
        sourceId,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        filterQuery: createFilter(filterQuery),
        defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      }}
    >
      {({ data, loading, refetch }) => {
        const overviewHost = getOr({}, `source.OverviewHost`, data);
        return children({
          id,
          overviewHost,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
