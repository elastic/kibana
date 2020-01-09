/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Position } from '@elastic/charts';
import { EuiButton, EuiPanel, EuiSelect } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { HeaderSection } from '../../../../components/header_section';
import { SignalsHistogram } from './signals_histogram';

import * as i18n from './translations';
import { Query } from '../../../../../../../../../src/plugins/data/common/query';
import { esFilters } from '../../../../../../../../../src/plugins/data/common/es_query';
import { SignalsHistogramOption, SignalsTotal } from './types';
import { signalsHistogramOptions } from './config';
import { getDetectionEngineUrl } from '../../../../components/link_to';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../../lib/kibana';

const defaultTotalSignalsObj: SignalsTotal = {
  value: 0,
  relation: 'eq',
};

interface SignalsHistogramPanelProps {
  defaultStackByOption?: SignalsHistogramOption;
  filters?: esFilters.Filter[];
  from: number;
  query?: Query;
  legendPosition?: Position;
  loadingInitial?: boolean;
  showLinkToSignals?: boolean;
  showTotalSignalsCount?: boolean;
  stackByOptions?: SignalsHistogramOption[];
  title?: string;
  to: number;
  updateDateRange: (min: number, max: number) => void;
}

export const SignalsHistogramPanel = memo<SignalsHistogramPanelProps>(
  ({
    defaultStackByOption = signalsHistogramOptions[0],
    filters,
    query,
    from,
    legendPosition = 'bottom',
    loadingInitial = false,
    showLinkToSignals = false,
    showTotalSignalsCount = false,
    stackByOptions,
    to,
    title = i18n.HISTOGRAM_HEADER,
    updateDateRange,
  }) => {
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const [totalSignalsObj, setTotalSignalsObj] = useState<SignalsTotal>(defaultTotalSignalsObj);
    const [selectedStackByOption, setSelectedStackByOption] = useState<SignalsHistogramOption>(
      defaultStackByOption
    );

    const totalSignals = useMemo(
      () =>
        i18n.SHOWING_SIGNALS(
          numeral(totalSignalsObj.value).format(defaultNumberFormat),
          totalSignalsObj.value,
          totalSignalsObj.relation === 'gte' ? '>' : totalSignalsObj.relation === 'lte' ? '<' : ''
        ),
      [totalSignalsObj]
    );

    const setSelectedOptionCallback = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions?.find(co => co.value === event.target.value) ?? defaultStackByOption
      );
    }, []);

    return (
      <EuiPanel>
        <HeaderSection title={title} subtitle={showTotalSignalsCount && totalSignals}>
          {stackByOptions && (
            <EuiSelect
              onChange={setSelectedOptionCallback}
              options={stackByOptions}
              prepend={i18n.STACK_BY_LABEL}
              value={selectedStackByOption.value}
            />
          )}
          {showLinkToSignals && (
            <EuiButton href={getDetectionEngineUrl()}>{i18n.VIEW_SIGNALS}</EuiButton>
          )}
        </HeaderSection>

        <SignalsHistogram
          filters={filters}
          from={from}
          legendPosition={legendPosition}
          loadingInitial={loadingInitial}
          query={query}
          to={to}
          setTotalSignalsCount={setTotalSignalsObj}
          stackByField={selectedStackByOption.value}
          updateDateRange={updateDateRange}
        />
      </EuiPanel>
    );
  }
);

SignalsHistogramPanel.displayName = 'SignalsHistogramPanel';
