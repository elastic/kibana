/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEsQueryConfig } from '@kbn/es-query';
import React, { memo } from 'react';
import { connect } from 'react-redux';

import { scoreIntervalToDateTime } from '../../components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../components/ml/types';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { convertToBuildEsQuery } from '../../lib/keury';
import { useKibanaCore } from '../../lib/compose/kibana_core';
import { hostsModel, inputsSelectors, State } from '../../store';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../store/inputs/actions';

import { HostsComponentProps } from './hosts';
import { CommonChildren, AnomaliesChildren } from './navigation/types';

interface HostsBodyComponentProps extends HostsComponentProps {
  children: CommonChildren | AnomaliesChildren;
}

const HostsBodyComponent = memo<HostsBodyComponentProps>(
  ({
    children,
    deleteQuery,
    filters,
    from,
    isInitializing,
    query,
    setAbsoluteRangeDatePicker,
    setQuery,
    timezone,
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
            filters,
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
                timezone,
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

HostsBodyComponent.displayName = 'HostsBodyComponent';

const makeMapStateToProps = () => {
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const mapStateToProps = (state: State) => ({
    query: getGlobalQuerySelector(state),
    filters: getGlobalFiltersQuerySelector(state),
  });
  return mapStateToProps;
};

export const HostsBody = connect(
  makeMapStateToProps,
  {
    setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
  }
)(HostsBodyComponent);
