/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { connect } from 'react-redux';

import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';

import { hostsModel, hostsSelectors, State } from '../../store';

import { HostsComponentProps } from './hosts';
import { CommonChildren, AnomaliesChildren } from './navigation/types';
import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { Anomaly } from '../../components/ml/types';

interface HostsBodyComponentProps extends HostsComponentProps {
  kqlQueryExpression: string;
  children: CommonChildren | AnomaliesChildren;
}

const HostsBodyComponent = memo<HostsBodyComponentProps>(
  ({
    deleteQuery,
    filterQuery,
    kqlQueryExpression,
    setAbsoluteRangeDatePicker,
    children,
    to,
    from,
    setQuery,
    isInitializing,
  }) => {
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <>
              {children({
                deleteQuery,
                endDate: to,
                filterQuery,
                kqlQueryExpression,
                skip: isInitializing,
                setQuery,
                startDate: from,
                type: hostsModel.HostsType.page,
                indexPattern,
                narrowDateRange: (score: Anomaly, interval: string) => {
                  const fromTo = scoreIntervalToDateTime(score, interval);
                  setAbsoluteRangeDatePicker({
                    id: 'global',
                    from: fromTo.from,
                    to: fromTo.to,
                  });
                },
              })}
            </>
          ) : null
        }
      </WithSource>
    );
  }
);

HostsBodyComponent.displayName = 'HostsBodyComponent';

const makeMapStateToProps = () => {
  const getHostsFilterQueryAsJson = hostsSelectors.hostsFilterQueryAsJson();
  const hostsFilterQueryExpression = hostsSelectors.hostsFilterQueryExpression();
  const mapStateToProps = (state: State) => ({
    filterQuery: getHostsFilterQueryAsJson(state, hostsModel.HostsType.page) || '',
    kqlQueryExpression: hostsFilterQueryExpression(state, hostsModel.HostsType.page) || '',
  });
  return mapStateToProps;
};

export const HostsBody = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
  }
)(HostsBodyComponent);
