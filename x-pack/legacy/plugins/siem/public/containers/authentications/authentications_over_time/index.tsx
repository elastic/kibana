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
import { inputsModel, State, inputsSelectors, hostsModel } from '../../../store';
import { withKibana, WithKibanaProps } from '../../../lib/kibana';
import { createFilter, getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';

import { AuthenticationsOverTimeGqlQuery } from './authentications_over_time.gql_query';
import {
  GetAuthenticationsOverTimeQuery,
  MatrixOverTimeHistogramData,
} from '../../../graphql/types';

const ID = 'authenticationsOverTimeQuery';

export interface AuthenticationsArgs {
  endDate: number;
  authenticationsOverTime: MatrixOverTimeHistogramData[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  totalCount: number;
}

export interface OwnProps extends QueryTemplateProps {
  children?: (args: AuthenticationsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface AuthenticationsOverTimeComponentReduxProps {
  isInspected: boolean;
}

type AuthenticationsOverTimeProps = OwnProps &
  AuthenticationsOverTimeComponentReduxProps &
  WithKibanaProps;

class AuthenticationsOverTimeComponentQuery extends QueryTemplate<
  AuthenticationsOverTimeProps,
  GetAuthenticationsOverTimeQuery.Query,
  GetAuthenticationsOverTimeQuery.Variables
> {
  public render() {
    const {
      children,
      filterQuery,
      id = ID,
      isInspected,
      kibana,
      sourceId,
      startDate,
      endDate,
    } = this.props;
    return (
      <Query<GetAuthenticationsOverTimeQuery.Query, GetAuthenticationsOverTimeQuery.Variables>
        query={AuthenticationsOverTimeGqlQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        variables={{
          filterQuery: createFilter(filterQuery),
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          defaultIndex: kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY),
          inspect: isInspected,
        }}
      >
        {({ data, loading, refetch }) => {
          const source = getOr({}, `source.AuthenticationsOverTime`, data);
          const authenticationsOverTime = getOr([], `authenticationsOverTime`, source);
          const totalCount = getOr(-1, 'totalCount', source);
          return children!({
            endDate: endDate!,
            authenticationsOverTime,
            id,
            inspect: getOr(null, 'inspect', source),
            loading,
            refetch,
            startDate: startDate!,
            totalCount,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const AuthenticationsOverTimeQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps),
  withKibana
)(AuthenticationsOverTimeComponentQuery);
