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

import { IPDetailsBodyComponentProps, type } from './types';
import { makeMapStateToProps } from './utils';

const IPDetailsBodyComponent = React.memo<IPDetailsBodyComponentProps>(
  ({
    children,
    filterQuery,
    from,
    isInitializing,
    detailName,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
    flowTarget,
  }) => {
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) =>
          indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <>
              {children({
                endDate: to,
                filterQuery,
                skip: isInitializing,
                setQuery,
                startDate: from,
                type,
                flowTarget,
                ip: detailName,
                narrowDateRange: (score, interval) => {
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

IPDetailsBodyComponent.displayName = 'IPDetailsBodyComponent';

export const IPDetailsBody = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchAbsoluteRangeDatePicker,
  }
)(IPDetailsBodyComponent);
