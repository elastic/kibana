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
import { GetIpOverviewQuery, IpOverviewData } from '../../graphql/types';
import { networkModel, inputsModel, inputsSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { ipOverviewQuery } from './index.gql_query';

const ID = 'ipOverviewQuery';

export interface IpOverviewArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  ipOverviewData: IpOverviewData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface IpOverviewReduxProps {
  isInspected: boolean;
}

export interface IpOverviewProps extends QueryTemplateProps {
  children: (args: IpOverviewArgs) => React.ReactNode;
  type: networkModel.NetworkType;
  ip: string;
}

const IpOverviewComponentQuery = pure<IpOverviewProps & IpOverviewReduxProps>(
  ({ id = ID, isInspected, children, filterQuery, skip, sourceId, ip }) => (
    <Query<GetIpOverviewQuery.Query, GetIpOverviewQuery.Variables>
      query={ipOverviewQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      skip={skip}
      variables={{
        sourceId,
        filterQuery: createFilter(filterQuery),
        ip,
        defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
        inspect: isInspected,
      }}
    >
      {({ data, loading, refetch }) => {
        const init: IpOverviewData = { host: {} };
        const ipOverviewData: IpOverviewData = getOr(init, 'source.IpOverview', data);
        return children({
          id,
          inspect: getOr(null, 'source.IpOverview.inspect', data),
          ipOverviewData,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);

IpOverviewComponentQuery.displayName = 'IpOverviewComponentQuery';

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: IpOverviewProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const IpOverviewQuery = connect(makeMapStateToProps)(IpOverviewComponentQuery);
