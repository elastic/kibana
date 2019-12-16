/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import chrome from 'ui/chrome';
import { connect } from 'react-redux';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { inputsModel, inputsSelectors, State } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';

import {
  GetHostOverviewQuery,
  GetHostOverviewQueryComponent,
  HostItem,
} from '../../../graphql/types';

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
  children: (args: HostOverviewArgs) => React.ReactElement;
  hostName: string;
  startDate: number;
  endDate: number;
}

class HostOverviewByNameComponentQuery extends QueryTemplate<
  OwnProps & HostOverviewReduxProps,
  GetHostOverviewQuery.Query,
  GetHostOverviewQuery.Variables
> {
  public render() {
    const {
      id = ID,
      isInspected,
      children,
      hostName,
      skip,
      sourceId,
      startDate,
      endDate,
    } = this.props;
    return (
      <GetHostOverviewQueryComponent
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
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
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
      </GetHostOverviewQueryComponent>
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

export const HostOverviewByNameQuery = connect(makeMapStateToProps)(
  HostOverviewByNameComponentQuery
);
