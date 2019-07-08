/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { GetKpiNetworkQuery, KpiNetworkData } from '../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiNetworkQuery } from './index.gql_query';

const ID = 'kpiNetworkQuery';

export interface KpiNetworkArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  kpiNetwork: KpiNetworkData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface KpiNetworkReducer {
  isInspected: boolean;
}

export interface KpiNetworkProps extends QueryTemplateProps {
  children: (args: KpiNetworkArgs) => React.ReactNode;
}

const KpiNetworkComponentQuery = pure<KpiNetworkProps & KpiNetworkReducer>(
  ({ id = ID, children, filterQuery, isInspected, skip, sourceId, startDate, endDate }) => (
    <Query<GetKpiNetworkQuery.Query, GetKpiNetworkQuery.Variables>
      query={kpiNetworkQuery}
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
        inspect: isInspected,
      }}
    >
      {({ data, loading, refetch }) => {
        const kpiNetwork = getOr({}, `source.KpiNetwork`, data);
        return children({
          id,
          inspect: getOr(null, 'source.KpiNetwork.inspect', data),
          kpiNetwork,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: KpiNetworkProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const KpiNetworkQuery = connect(makeMapStateToProps)(KpiNetworkComponentQuery);
