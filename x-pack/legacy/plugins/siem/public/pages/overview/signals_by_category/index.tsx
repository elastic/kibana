/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { esFilters, IIndexPattern, Query } from 'src/plugins/data/public';

import { SignalsHistogramPanel } from '../../detection_engine/components/signals_histogram_panel';
import { SetAbsoluteRangeDatePicker } from '../../network/types';
import { inputsModel } from '../../../store';

import * as i18n from '../translations';

const NO_FILTERS: esFilters.Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };

interface Props {
  filters?: esFilters.Filter[];
  from: number;
  indexPattern: IIndexPattern;
  query?: Query;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
  to: number;
}

export const SignalsByCategory = React.memo<Props>(
  ({ filters = NO_FILTERS, from, query = DEFAULT_QUERY, setAbsoluteRangeDatePicker, to }) => {
    const updateDateRangeCallback = useCallback(
      (min: number, max: number) => {
        setAbsoluteRangeDatePicker!({ id: 'global', from: min, to: max });
      },
      [setAbsoluteRangeDatePicker]
    );

    return (
      <SignalsHistogramPanel
        filters={filters}
        from={from}
        query={query}
        showTotalSignalsCount={true}
        showLinkToSignals={true}
        defaultStackByOption={{
          text: `${i18n.SIGNALS_BY_CATEGORY}`,
          value: 'signal.rule.threats',
        }}
        legendPosition={'right'}
        to={to}
        title={i18n.SIGNALS_BY_CATEGORY}
        updateDateRange={updateDateRangeCallback}
      />
    );
  }
);

SignalsByCategory.displayName = 'SignalsByCategory';
