/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { useEuiBreakpoint } from '@elastic/eui';
import {
  type MetricFieldsCountProps,
  type TotalFieldsCountProps,
  MetricFieldsCount,
  TotalFieldsCount,
  dvFieldCountItemCss,
} from '../stats_table/components/field_count_stats';

interface Props extends TotalFieldsCountProps, MetricFieldsCountProps {
  showEmptyFields: boolean;
  toggleShowEmptyFields: () => void;
}

export const FieldCountPanel: FC<Props> = ({
  metricsStats,
  fieldsCountStats,
  showEmptyFields,
  toggleShowEmptyFields,
}) => {
  const { euiTheme } = useEuiTheme();

  const dvFieldCountPanelCss = css({
    marginLeft: euiTheme.size.xs,
    [useEuiBreakpoint(['xs', 's'])]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  });
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      css={dvFieldCountPanelCss}
      data-test-subj="dataVisualizerFieldCountPanel"
      responsive={false}
      wrap
    >
      <TotalFieldsCount fieldsCountStats={fieldsCountStats} />
      <MetricFieldsCount metricsStats={metricsStats} />
      <EuiFlexItem css={dvFieldCountItemCss}>
        <EuiSwitch
          data-test-subj="dataVisualizerShowEmptyFieldsSwitch"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.searchPanel.showEmptyFields"
              defaultMessage="Show empty fields"
            />
          }
          checked={showEmptyFields}
          onChange={toggleShowEmptyFields}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
