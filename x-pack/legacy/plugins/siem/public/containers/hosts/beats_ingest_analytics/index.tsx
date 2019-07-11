/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import chrome from 'ui/chrome';
import { connect } from 'react-redux';
import { createFilter } from '../../helpers';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel, inputsSelectors, State } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';

import { HostBeatsIngestAnalyticsGqlQuery } from './beats_ingest_analytics.gql_query';
import { BeatsIngestAnalyticsData, HostBeatsIngestAnalyticsQuery } from '../../../graphql/types';

const ID = 'hostOverviewQuery';

export interface HostBeatsIngestAnalyticsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  beatsIngestAnalyticsData: BeatsIngestAnalyticsData;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  endDate: number;
}

export interface HostBeatsIngestAnalyticsReduxProps {
  isInspected: boolean;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: HostBeatsIngestAnalyticsArgs) => React.ReactNode;
  startDate: number;
  endDate: number;
}

class HostBeatsIngestAnalyticsComponentQuery extends QueryTemplate<
  OwnProps & HostBeatsIngestAnalyticsReduxProps,
  HostBeatsIngestAnalyticsQuery.Query,
  HostBeatsIngestAnalyticsQuery.Variables
> {
  public render() {
    const {
      id = ID,
      children,
      endDate,
      filterQuery,
      isInspected,
      skip,
      sourceId,
      startDate,
    } = this.props;
    return (
      <Query<HostBeatsIngestAnalyticsQuery.Query, HostBeatsIngestAnalyticsQuery.Variables>
        query={HostBeatsIngestAnalyticsGqlQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
          filterQuery: createFilter(filterQuery),
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
          inspect: isInspected,
        }}
      >
        {({ data, loading, refetch }) => {
          const beatsIngestAnalyticsData = getOr([], 'source.HostBeatsIngestAnalytics', data);
          return children({
            id,
            inspect: getOr(null, 'source.HostBeatsIngestAnalytics.inspect', data),
            refetch,
            loading,
            beatsIngestAnalyticsData,
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

export const HostBeatsIngestAnalyticsContainer = connect(makeMapStateToProps)(
  HostBeatsIngestAnalyticsComponentQuery
);
