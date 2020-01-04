/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { GetIpOverviewQueryComponent, IpOverviewData } from '../../graphql/types';
import { networkModel, inputsModel, inputsSelectors, State } from '../../store';
import { useUiSetting } from '../../lib/kibana';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplateProps } from '../query_template';

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
  children: (args: IpOverviewArgs) => React.ReactElement;
  type: networkModel.NetworkType;
  ip: string;
}

const IpOverviewComponentQuery = React.memo<IpOverviewProps & IpOverviewReduxProps>(
  ({ id = ID, isInspected, children, filterQuery, skip, sourceId, ip }) => (
    <GetIpOverviewQueryComponent
      fetchPolicy={getDefaultFetchPolicy()}
      notifyOnNetworkStatusChange
      skip={skip}
      variables={{
        sourceId,
        filterQuery: createFilter(filterQuery),
        ip,
        defaultIndex: useUiSetting<string[]>(DEFAULT_INDEX_KEY),
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
    </GetIpOverviewQueryComponent>
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
