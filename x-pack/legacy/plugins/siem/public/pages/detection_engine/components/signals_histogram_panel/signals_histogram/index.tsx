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
  Settings,
  timeFormatter,
} from '@elastic/charts';
import React, { useEffect, useMemo } from 'react';
import { EuiLoadingContent } from '@elastic/eui';
import { useQuerySignals } from '../../../../../containers/detection_engine/signals/use_query';
import { Query } from '../../../../../../../../../../src/plugins/data/common/query';
import { esFilters } from '../../../../../../../../../../src/plugins/data/common/es_query';
import { SignalsAggregation } from '../types';
import { formatSignalsData, getSignalsHistogramQuery } from './helpers';
import { useTheme } from '../../../../../components/charts/common';

interface HistogramSignalsProps {
  to: number;
  from: number;
  query?: Query; // TODO combine with provided query
  filters?: esFilters.Filter[]; // TODO combine with provided filters
  legendPosition?: 'bottom' | 'left'; // TODO for use on new overview design
  stackByField: string;
  showLinkToSignals?: boolean; // TODO for use on new overview design
  showTotalSignalsCount?: boolean; // TODO for use on new overview design
}

export const SignalsHistogram = React.memo<HistogramSignalsProps>(({ to, from, stackByField }) => {
  const [isLoadingSignals, signalsData, setQueryString] = useQuerySignals<{}, SignalsAggregation>(
    JSON.stringify(getSignalsHistogramQuery(stackByField, from, to))
  );
  const theme = useTheme();

  const formattedSignalsData = useMemo(() => formatSignalsData(signalsData), [signalsData]);

  useEffect(() => {
    try {
      setQueryString(JSON.stringify(getSignalsHistogramQuery(stackByField, from, to)));
    } catch (e) {
      setQueryString('');
    }
  }, [stackByField, from, to]);

  return (
    <>
      {isLoadingSignals ? (
        <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
      ) : (
        <Chart size={['100%', 259]}>
          <Settings legendPosition="bottom" showLegend theme={theme} />

          <Axis
            id={getAxisId('signalAxisX')}
            position="bottom"
            tickFormat={timeFormatter(niceTimeFormatByDay(1))}
          />

          <Axis id={getAxisId('signalAxisY')} position="left" />

          <HistogramBarSeries
            id={getSpecId('signalBar')}
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
});
SignalsHistogram.displayName = 'SignalsHistogram';
