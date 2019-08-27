/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiButtonGroupProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type LogRateView = 'chart' | 'table';

export const isValidLogRateView = (maybeView: string): maybeView is LogRateView =>
  ['chart', 'table'].includes(maybeView);

interface LogRateViewSwitcherProps {
  selectedView: LogRateView;
  onChange: EuiButtonGroupProps['onChange'];
}

const chartLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.viewSwitcher.chartLabel',
  { defaultMessage: 'Rate chart' }
);
const tableLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.viewSwitcher.tableLabel',
  { defaultMessage: 'Anomaly table' }
);
const legendLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.viewSwitcher.legendLabel',
  { defaultMessage: 'Switch between the log rate chart and the anomalies table view' }
);

const buttons = [
  {
    id: 'chart',
    label: chartLabel,
    iconType: 'apps',
  },
  {
    id: 'table',
    label: tableLabel,
    iconType: 'editorUnorderedList',
  },
];

export const LogRateViewSwitcher: React.FunctionComponent<LogRateViewSwitcherProps> = ({
  selectedView,
  onChange,
}) => {
  return (
    <EuiButtonGroup
      legend={legendLabel}
      options={buttons}
      color="primary"
      idSelected={selectedView}
      onChange={onChange}
    />
  );
};
