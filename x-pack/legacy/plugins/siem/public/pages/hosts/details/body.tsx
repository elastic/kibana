/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';

import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../../containers/source';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../store/inputs/actions';
import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../../components/ml/types';
import { getHostDetailsEventsKqlQueryExpression } from '../helpers';

import { HostDetailsBodyComponentProps } from './type';
import { getFilterQuery, type, makeMapStateToProps } from './utils';

const HostDetailsBodyComponent = React.memo<HostDetailsBodyComponentProps>(
  ({
    children,
    filterQueryExpression,
    from,
    isInitializing,
    detailName,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
  }) => {
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <>
              {children({
                endDate: to,
                filterQuery: getFilterQuery(detailName, filterQueryExpression, indexPattern),
                kqlQueryExpression: getHostDetailsEventsKqlQueryExpression({
                  filterQueryExpression,
                  hostName: detailName,
                }),
                skip: isInitializing,
                setQuery,
                startDate: from,
                type,
                indexPattern,
                hostName: detailName,
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

HostDetailsBodyComponent.displayName = 'HostDetailsBodyComponent';

export const HostDetailsBody = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  }
)(HostDetailsBodyComponent);
