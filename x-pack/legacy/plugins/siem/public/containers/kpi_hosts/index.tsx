/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import chrome from 'ui/chrome';
import { pure } from 'recompose';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { GetKpiHostsQuery, KpiHostsData } from '../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiHostsQuery } from './index.gql_query';

const ID = 'kpiHostsQuery';

export interface KpiHostsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  kpiHosts: KpiHostsData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface KpiHostsReducer {
  isInspected: boolean;
}

export interface KpiHostsProps extends QueryTemplateProps {
  children: (args: KpiHostsArgs) => React.ReactNode;
}

const KpiHostsComponentQuery = pure<KpiHostsProps & KpiHostsReducer>(
  ({ id = ID, children, endDate, filterQuery, isInspected, skip, sourceId, startDate }) => (
    <Query<GetKpiHostsQuery.Query, GetKpiHostsQuery.Variables>
      query={kpiHostsQuery}
      fetchPolicy={getDefaultFetchPolicy()}
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
        inspect: isInspected,
      }}
    >
      {({ data, loading, refetch }) => {
        const kpiHosts = getOr({}, `source.KpiHosts`, data);
        return children({
          id,
          inspect: getOr(null, 'source.KpiHosts.inspect', data),
          kpiHosts,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);

KpiHostsComponentQuery.displayName = 'KpiHostsComponentQuery';

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: KpiHostsProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const KpiHostsQuery = connect(makeMapStateToProps)(KpiHostsComponentQuery);
