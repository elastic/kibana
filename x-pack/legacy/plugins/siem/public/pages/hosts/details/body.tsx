/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEsQueryConfig } from '@kbn/es-query';
import React from 'react';
import { connect } from 'react-redux';

import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../../containers/source';
import { setAbsoluteRangeDatePicker as dispatchAbsoluteRangeDatePicker } from '../../../store/inputs/actions';
import { scoreIntervalToDateTime } from '../../../components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../../components/ml/types';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { useKibanaCore } from '../../../lib/compose/kibana_core';

import { HostDetailsBodyComponentProps } from './types';
import { type, makeMapStateToProps } from './utils';

const HostDetailsBodyComponent = React.memo<HostDetailsBodyComponentProps>(
  ({
    children,
    deleteQuery,
    detailName,
    filters,
    from,
    isInitializing,
    query,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
  }) => {
    const core = useKibanaCore();
    return (
      <WithSource sourceId="default">
        {({ indicesExist, indexPattern }) => {
          const filterQuery = convertToBuildEsQuery({
            config: getEsQueryConfig(core.uiSettings),
            indexPattern,
            queries: [query],
            filters: [
              {
                meta: {
                  alias: null,
                  negate: false,
                  disabled: false,
                  type: 'phrase',
                  key: 'host.name',
                  value: detailName,
                  params: {
                    query: detailName,
                  },
                },
                query: {
                  match: {
                    'host.name': {
                      query: detailName,
                      type: 'phrase',
                    },
                  },
                },
              },
              ...filters,
            ],
          });
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <>
              {children({
                deleteQuery,
                endDate: to,
                filterQuery,
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
                updateDateRange: (min: number, max: number) => {
                  setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
                },
              })}
            </>
          ) : null;
        }}
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
