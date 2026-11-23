/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonGroup, EuiFormRow, type EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';

const viewTypeOptions: EuiButtonGroupOptionProps[] = [
  {
    id: `charts`,
    label: (
      <FormattedMessage
        id="xpack.aiops.embeddableChangePointChart.viewTypeSelector.chartsLabel"
        defaultMessage="Charts"
      />
    ),
    iconType: 'chartLine',
  },
  {
    id: `table`,
    label: (
      <FormattedMessage
        id="xpack.aiops.embeddableChangePointChart.viewTypeSelector.tableLabel"
        defaultMessage="Table"
      />
    ),
    iconType: 'table',
  },
];

export interface ViewTypeSelectorProps {
  value: ChangePointDetectionViewType;
  onChange: (update: ChangePointDetectionViewType) => void;
  showTableOption?: boolean;
  isDisabled?: boolean;
}

export const ViewTypeSelector: FC<ViewTypeSelectorProps> = ({
  value,
  onChange,
  showTableOption = true,
  isDisabled = false,
}) => {
  const options = showTableOption
    ? viewTypeOptions
    : viewTypeOptions.filter((option) => option.id !== 'table');

  return (
    <EuiFormRow
      label={i18n.translate('xpack.aiops.embeddableChangePointChart.viewTypeLabel', {
        defaultMessage: 'View type',
      })}
    >
      <EuiButtonGroup
        data-test-subj="aiopsChangePointViewTypeSelector"
        isDisabled={isDisabled}
        legend={i18n.translate('xpack.aiops.embeddableChangePointChart.viewTypeLegend', {
          defaultMessage: 'Chart view or table view',
        })}
        options={options}
        idSelected={value}
        onChange={onChange as (id: string) => void}
      />
    </EuiFormRow>
  );
};
