/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import { SignalsHistogramPanel } from '../../detection_engine/components/signals_histogram_panel';
import { signalsHistogramOptions } from '../../detection_engine/components/signals_histogram_panel/config';
import { useSignalIndex } from '../../../containers/detection_engine/signals/use_signal_index';
import { SetAbsoluteRangeDatePicker } from '../../network/types';
import { Filter, IIndexPattern, Query } from '../../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';
import * as i18n from '../translations';

const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'signal.rule.threat.tactic.name';
const NO_FILTERS: Filter[] = [];

interface Props {
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: Filter[];
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

const SignalsByCategoryComponent: React.FC<Props> = ({
  deleteQuery,
  filters = NO_FILTERS,
  from,
  query = DEFAULT_QUERY,
  setAbsoluteRangeDatePicker,
  setQuery,
  to,
}) => {
  const { signalIndexName } = useSignalIndex();
  const updateDateRangeCallback = useCallback(
    (min: number, max: number) => {
      setAbsoluteRangeDatePicker!({ id: 'global', from: min, to: max });
    },
    [setAbsoluteRangeDatePicker]
  );

  const defaultStackByOption =
    signalsHistogramOptions.find(o => o.text === DEFAULT_STACK_BY) ?? signalsHistogramOptions[0];

  return (
    <SignalsHistogramPanel
      deleteQuery={deleteQuery}
      defaultStackByOption={defaultStackByOption}
      filters={filters}
      from={from}
      query={query}
      signalIndexName={signalIndexName}
      setQuery={setQuery}
      showTotalSignalsCount={true}
      showLinkToSignals={true}
      stackByOptions={signalsHistogramOptions}
      legendPosition={'right'}
      to={to}
      title={i18n.SIGNAL_COUNT}
      updateDateRange={updateDateRangeCallback}
    />
  );
};

SignalsByCategoryComponent.displayName = 'SignalsByCategoryComponent';

export const SignalsByCategory = React.memo(SignalsByCategoryComponent);
