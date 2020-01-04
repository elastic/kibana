/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { GetOverviewNetworkQueryComponent, OverviewNetworkData } from '../../../graphql/types';
import { useUiSetting } from '../../../lib/kibana';
import { State } from '../../../store';
import { inputsModel, inputsSelectors } from '../../../store/inputs';
import { createFilter, getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplateProps } from '../../query_template';

export const ID = 'overviewNetworkQuery';

export interface OverviewNetworkArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  overviewNetwork: OverviewNetworkData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OverviewNetworkReducer {
  isInspected: boolean;
}

export interface OverviewNetworkProps extends QueryTemplateProps {
  children: (args: OverviewNetworkArgs) => React.ReactElement;
  sourceId: string;
  endDate: number;
  startDate: number;
}

export const OverviewNetworkComponentQuery = React.memo<
  OverviewNetworkProps & OverviewNetworkReducer
>(({ id = ID, children, filterQuery, isInspected, sourceId, startDate, endDate }) => (
  <GetOverviewNetworkQueryComponent
    fetchPolicy={getDefaultFetchPolicy()}
    notifyOnNetworkStatusChange
    variables={{
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
      filterQuery: createFilter(filterQuery),
      defaultIndex: useUiSetting<string[]>(DEFAULT_INDEX_KEY),
      inspect: isInspected,
    }}
  >
    {({ data, loading, refetch }) => {
      const overviewNetwork = getOr({}, `source.OverviewNetwork`, data);
      return children({
        id,
        inspect: getOr(null, 'source.OverviewNetwork.inspect', data),
        overviewNetwork,
        loading,
        refetch,
      });
    }}
  </GetOverviewNetworkQueryComponent>
));

OverviewNetworkComponentQuery.displayName = 'OverviewNetworkComponentQuery';

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OverviewNetworkProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const OverviewNetworkQuery = connect(makeMapStateToProps)(OverviewNetworkComponentQuery);
