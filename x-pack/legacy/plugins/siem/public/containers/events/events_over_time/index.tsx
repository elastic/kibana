/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel, State, inputsSelectors, hostsModel } from '../../../store';
import { createFilter, getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';
import { useUiSetting } from '../../../lib/kibana';

import { EventsOverTimeGqlQuery } from './events_over_time.gql_query';
import { GetEventsOverTimeQuery, MatrixOverTimeHistogramData } from '../../../graphql/types';

const ID = 'eventsOverTimeQuery';

export interface EventsArgs {
  endDate: number;
  eventsOverTime: MatrixOverTimeHistogramData[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  totalCount: number;
}

export interface OwnProps extends QueryTemplateProps {
  children?: (args: EventsArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface EventsOverTimeComponentReduxProps {
  isInspected: boolean;
}

type EventsOverTimeProps = OwnProps & EventsOverTimeComponentReduxProps;

class EventsOverTimeComponentQuery extends QueryTemplate<
  EventsOverTimeProps,
  GetEventsOverTimeQuery.Query,
  GetEventsOverTimeQuery.Variables
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
      <Query<GetEventsOverTimeQuery.Query, GetEventsOverTimeQuery.Variables>
        query={EventsOverTimeGqlQuery}
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
          defaultIndex: useUiSetting<string[]>(DEFAULT_INDEX_KEY),
          inspect: isInspected,
        }}
      >
        {({ data, loading, refetch }) => {
          const source = getOr({}, `source.EventsOverTime`, data);
          const eventsOverTime = getOr([], `eventsOverTime`, source);
          const totalCount = getOr(-1, 'totalCount', source);
          return children!({
            endDate: endDate!,
            eventsOverTime,
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

export const EventsOverTimeQuery = connect(makeMapStateToProps)(EventsOverTimeComponentQuery);
