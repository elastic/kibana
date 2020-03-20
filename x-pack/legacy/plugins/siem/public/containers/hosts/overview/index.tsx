/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';
import { compose } from 'redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel, inputsSelectors, State } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';
import { withKibana, WithKibanaProps } from '../../../lib/kibana';

import { HostOverviewQuery } from './host_overview.gql_query';
import { GetHostOverviewQuery, HostItem } from '../../../graphql/types';

const ID = 'hostOverviewQuery';

export interface HostOverviewArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  hostOverview: HostItem;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  endDate: number;
}

export interface HostOverviewReduxProps {
  isInspected: boolean;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: HostOverviewArgs) => React.ReactNode;
  hostName: string;
  startDate: number;
  endDate: number;
}

type HostsOverViewProps = OwnProps & HostOverviewReduxProps & WithKibanaProps;

class HostOverviewByNameComponentQuery extends QueryTemplate<
  HostsOverViewProps,
  GetHostOverviewQuery.Query,
  GetHostOverviewQuery.Variables
> {
  public render() {
    const {
      id = ID,
      isInspected,
      children,
      hostName,
      kibana,
      skip,
      sourceId,
      startDate,
      endDate,
    } = this.props;
    return (
      <Query<GetHostOverviewQuery.Query, GetHostOverviewQuery.Variables>
        query={HostOverviewQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          sourceId,
          hostName,
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
          defaultIndex: kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY),
          inspect: isInspected,
        }}
      >
        {({ data, loading, refetch }) => {
          const hostOverview = getOr([], 'source.HostOverview', data);
          return children({
            id,
            inspect: getOr(null, 'source.HostOverview.inspect', data),
            refetch,
            loading,
            hostOverview,
            startDate,
            endDate,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const HostOverviewByNameQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps),
  withKibana
)(HostOverviewByNameComponentQuery);
