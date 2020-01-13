/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import { State, inputsSelectors } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate } from '../../query_template';

import { AnomaliesOverTimeGqlQuery } from './anomalies_over_time.gql_query';
import { GetAnomaliesOverTimeQuery } from '../../../graphql/types';
import { AnomaliesOverTimeProps, OwnProps } from './types';

const ID = 'anomaliesOverTimeQuery';

class AnomaliesOverTimeComponentQuery extends QueryTemplate<
  AnomaliesOverTimeProps,
  GetAnomaliesOverTimeQuery.Query,
  GetAnomaliesOverTimeQuery.Variables
> {
  public render() {
    const {
      children,
      endDate,
      filterQuery,
      id = ID,
      isInspected,
      sourceId,
      startDate,
    } = this.props;

    return (
      <Query<GetAnomaliesOverTimeQuery.Query, GetAnomaliesOverTimeQuery.Variables>
        query={AnomaliesOverTimeGqlQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        variables={{
          filterQuery,
          sourceId,
          timerange: {
            interval: 'day',
            from: startDate!,
            to: endDate!,
          },
          defaultIndex: ['.ml-anomalies-*'],
          inspect: isInspected,
        }}
      >
        {({ data, loading, refetch }) => {
          const source = getOr({}, `source.AnomaliesOverTime`, data);
          const anomaliesOverTime = getOr([], `anomaliesOverTime`, source);
          const totalCount = getOr(-1, 'totalCount', source);
          return children!({
            endDate: endDate!,
            anomaliesOverTime,
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
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const AnomaliesOverTimeQuery = connect(makeMapStateToProps)(AnomaliesOverTimeComponentQuery);
