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

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { KpiHostDetailsData, GetKpiHostDetailsQuery } from '../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiHostDetailsQuery } from './index.gql_query';

const ID = 'kpiHostDetailsQuery';

export interface KpiHostDetailsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  kpiHostDetails: KpiHostDetailsData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface QueryKpiHostDetailsProps extends QueryTemplateProps {
  children: (args: KpiHostDetailsArgs) => React.ReactNode;
}

export interface KpiHostDetailsReducer {
  isInspected: boolean;
  skipQuery: boolean;
}

const KpiHostDetailsComponentQuery = ({
  id = ID,
  children,
  endDate,
  filterQuery,
  isInspected,
  skip,
  skipQuery = false,
  sourceId,
  startDate,
}: QueryKpiHostDetailsProps & KpiHostDetailsReducer) => (
  <Query<GetKpiHostDetailsQuery.Query, GetKpiHostDetailsQuery.Variables>
    query={kpiHostDetailsQuery}
    fetchPolicy="cache-and-network"
    notifyOnNetworkStatusChange
    skip={skip || skipQuery}
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
      const kpiHostDetails = getOr({}, `source.KpiHostDetails`, data);
      return children({
        id,
        inspect: getOr(null, 'source.KpiHostDetails.inspect', data),
        kpiHostDetails,
        loading,
        refetch,
      });
    }}
  </Query>
);

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: QueryKpiHostDetailsProps) => {
    const { isInspected, inspect } = getQuery(state, id);
    return {
      isInspected,
      skipQuery: !isInspected && inspect != null,
    };
  };
  return mapStateToProps;
};

export const KpiHostDetailsQuery = connect(makeMapStateToProps)(KpiHostDetailsComponentQuery);
