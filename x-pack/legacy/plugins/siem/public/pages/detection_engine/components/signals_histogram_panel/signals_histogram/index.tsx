/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  getAxisId,
  getSpecId,
  HistogramBarSeries,
  niceTimeFormatByDay,
  Position,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import React, { useEffect, useMemo } from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import { useQuerySignals } from '../../../../../containers/detection_engine/signals/use_query';
import { Query } from '../../../../../../../../../../src/plugins/data/common/query';
import { esFilters, esQuery } from '../../../../../../../../../../src/plugins/data/common/es_query';
import { RegisterQuery, SignalsAggregation, SignalsTotal } from '../types';
import { formatSignalsData, getSignalsHistogramQuery } from './helpers';
import { useTheme } from '../../../../../components/charts/common';
import { useKibana } from '../../../../../lib/kibana';
import { inputsModel } from '../../../../../store';
import { DETECTIONS_HISTOGRAM_ID } from '..';

interface HistogramSignalsProps {
  filters?: esFilters.Filter[];
  from: number;
  isInspect: boolean;
  legendPosition?: Position;
  loadingInitial: boolean;
  query?: Query;
  registerQuery: (params: RegisterQuery) => void;
  signalIndexName: string | null;
  setTotalSignalsCount: React.Dispatch<SignalsTotal>;
  stackByField: string;
  to: number;
  updateDateRange: (min: number, max: number) => void;
}

export const SignalsHistogram = React.memo<HistogramSignalsProps>(
  ({
    to,
    from,
    query,
    filters,
    legendPosition = 'right',
    loadingInitial,
    registerQuery,
    signalIndexName,
    setTotalSignalsCount,
    stackByField,
    updateDateRange,
  }) => {
    const {
      loading: isLoadingSignals,
      data: signalsData,
      setQuery,
      response,
      request,
      refetch,
    } = useQuerySignals<{}, SignalsAggregation>(
      getSignalsHistogramQuery(stackByField, from, to, []),
      signalIndexName
    );
    const theme = useTheme();
    const kibana = useKibana();

    const formattedSignalsData = useMemo(() => formatSignalsData(signalsData), [signalsData]);

    useEffect(() => {
      if (refetch != null && registerQuery != null) {
        registerQuery({
          id: DETECTIONS_HISTOGRAM_ID,
          inspect: {
            dsl: [request],
            response: [response],
          },
          loading: isLoadingSignals,
          refetch: refetch as inputsModel.Refetch,
        });
      }
    }, [registerQuery, isLoadingSignals, signalsData, response, request, refetch]);

    useEffect(() => {
      setTotalSignalsCount(
        signalsData?.hits.total ?? {
          value: 0,
          relation: 'eq',
        }
      );
    }, [signalsData]);

    useEffect(() => {
      const converted = esQuery.buildEsQuery(
        undefined,
        query != null ? [query] : [],
        filters?.filter(f => f.meta.disabled === false) ?? [],
        {
          ...esQuery.getEsQueryConfig(kibana.services.uiSettings),
          dateFormatTZ: undefined,
        }
      );

      setQuery(
        getSignalsHistogramQuery(stackByField, from, to, !isEmpty(converted) ? [converted] : [])
      );
    }, [stackByField, from, to, query, filters]);

    return (
      <>
        {loadingInitial || isLoadingSignals ? (
          <EuiLoadingContent data-test-subj="loadingPanelSignalsHistogram" lines={10} />
        ) : (
          <Chart size={['100%', 259]}>
            <Settings
              legendPosition={legendPosition}
              onBrushEnd={updateDateRange}
              showLegend
              theme={theme}
            />

            <Axis
              id={getAxisId('signalsHistogramAxisX')}
              position="bottom"
              tickFormat={timeFormatter(niceTimeFormatByDay(1))}
            />

            <Axis id={getAxisId('signalsHistogramAxisY')} position="left" />

            <HistogramBarSeries
              id={getSpecId('signalsHistogram')}
              xScaleType="time"
              yScaleType="linear"
              xAccessor="x"
              yAccessors={['y']}
              splitSeriesAccessors={['g']}
              data={formattedSignalsData}
            />
          </Chart>
        )}
      </>
    );
  }
);
SignalsHistogram.displayName = 'SignalsHistogram';
