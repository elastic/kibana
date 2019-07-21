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
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel, State, inputsSelectors, hostsModel } from '../../../store';
import { createFilter, getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';

import { EventsOverTimeGqlQuery } from './events_over_time.gql_query';
import { GetEventsOverTimeQuery, EventsOverTimeData } from '../../../graphql/types';

const ID = 'eventsOverTimeQuery';

export interface EventsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  refetch: inputsModel.Refetch;
  eventsOverTime: EventsOverTimeData;
  startDate: number;
  endDate: number;
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
      filterQuery,
      id = ID,
      isInspected,
      sourceId,
      startDate,
      endDate,
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
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          inspect: isInspected,
        }}
      >
        {({ data, loading, refetch }) => {
          const eventsOverTime = getOr({}, `source.EventsOverTime`, data);
          return children!({
            id,
            inspect: getOr(null, 'inspect', eventsOverTime),
            refetch,
            loading,
            eventsOverTime,
            startDate: startDate!,
            endDate: endDate!,
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
