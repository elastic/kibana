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

import { AlertsOverTimeGqlQuery } from './alerts_over_time.gql_query';
import { MatrixOverTimeHistogramData, GetAlertsOverTimeQuery } from '../../../graphql/types';

const ID = 'alertsOverTimeQuery';

export interface AlertsArgs {
  endDate: number;
  alertsOverTime: MatrixOverTimeHistogramData[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  totalCount: number;
}

export interface OwnProps extends QueryTemplateProps {
  children?: (args: AlertsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface AlertsOverTimeComponentReduxProps {
  isInspected: boolean;
}

type AlertsOverTimeProps = OwnProps & AlertsOverTimeComponentReduxProps & WithKibanaProps;

class AlertsOverTimeComponentQuery extends QueryTemplate<
  AlertsOverTimeProps,
  GetAlertsOverTimeQuery.Query,
  GetAlertsOverTimeQuery.Variables
> {
  public render() {
    const {
      children,
      endDate,
      filterQuery,
      id = ID,
      isInspected,
      kibana,
      sourceId,
      startDate,
    } = this.props;
    return (
      <Query<GetAlertsOverTimeQuery.Query, GetAlertsOverTimeQuery.Variables>
        fetchPolicy={getDefaultFetchPolicy()}
        query={AlertsOverTimeGqlQuery}
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
        notifyOnNetworkStatusChange
      >
        {({ data, loading, refetch }) => {
          const source = getOr({}, `source.AlertsHistogram`, data);
          const alertsOverTime = getOr([], `alertsOverTimeByModule`, source);
          const totalCount = getOr(-1, 'totalCount', source);
          return children!({
            endDate: endDate!,
            alertsOverTime,
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

export const AlertsOverTimeQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps),
  withKibana
)(AlertsOverTimeComponentQuery);
