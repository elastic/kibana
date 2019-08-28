/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiButtonGroupProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ViewMode } from './index';

interface Props {
  selectedView: string;
  onChange: EuiButtonGroupProps['onChange'];
}

const chartLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.viewSwitcher.chartLabel',
  { defaultMessage: 'Chart view' }
);
const tableLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.viewSwitcher.tableLabel',
  { defaultMessage: 'Table view' }
);
const legendLabel = i18n.translate(
  'xpack.infra.logs.analysis.logRateSection.viewSwitcher.legendLabel',
  { defaultMessage: 'Switch between chart and table view' }
);

export const ViewSwitcher = ({ selectedView, onChange }: Props) => {
  const buttons = [
    {
      id: ViewMode.chart,
      label: chartLabel,
      iconType: 'apps',
    },
    {
      id: ViewMode.table,
      label: tableLabel,
      iconType: 'editorUnorderedList',
    },
  ];
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
