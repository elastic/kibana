/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPanel, EuiSelect } from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';

import { HeaderSection } from '../../../../components/header_section';
import { SignalsHistogram } from './signals_histogram';

import * as i18n from './translations';
import { Query } from '../../../../../../../../../src/plugins/data/common/query';
import { esFilters } from '../../../../../../../../../src/plugins/data/common/es_query';
import { SignalsHistogramOption } from './types';
import { signalsHistogramOptions } from './config';

interface SignalsHistogramPanelProps {
  defaultStackByOption?: SignalsHistogramOption;
  filters: esFilters.Filter[];
  from: number;
  query?: Query;
  stackByOptions?: SignalsHistogramOption[];
  to: number;
}

export const SignalsHistogramPanel = memo<SignalsHistogramPanelProps>(
  ({
    defaultStackByOption = signalsHistogramOptions[0],
    stackByOptions,
    filters,
    query,
    to,
    from,
  }) => {
    const [selectedStackByOption, setSelectedStackByOption] = useState<SignalsHistogramOption>(
      defaultStackByOption
    );

    const setSelectedChatOptionCallback = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStackByOption(
          stackByOptions?.find(co => co.value === event.target.value) ?? defaultStackByOption
        );
      },
      []
    );

    return (
      <EuiPanel>
        <HeaderSection title={i18n.HISTOGRAM_HEADER}>
          {stackByOptions && (
            <EuiSelect
              onChange={setSelectedChatOptionCallback}
              options={stackByOptions}
              prepend={i18n.STACK_BY_LABEL}
              value={defaultStackByOption.value}
            />
          )}
        </HeaderSection>

        <SignalsHistogram
          filters={filters}
          from={from}
          query={query}
          to={to}
          stackByField={selectedStackByOption.value}
        />
      </EuiPanel>
    );
  }
);

SignalsHistogramPanel.displayName = 'SignalsChart';
