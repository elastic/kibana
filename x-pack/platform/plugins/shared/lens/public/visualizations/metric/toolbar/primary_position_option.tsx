/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { MetricStyle } from '@elastic/charts';
import { EuiButtonGroup, EuiFormRow, EuiIconTip } from '@elastic/eui';

const primaryPositionModes: Array<{
  id: MetricStyle['valuePosition'];
  label: string;
}> = [
  {
    id: 'top',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.top', {
      defaultMessage: 'Top',
    }),
  },
  {
    id: 'bottom',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.bottom', {
      defaultMessage: 'Bottom',
    }),
  },
];

export function PrimaryPositionOption({
  value,
  onChange,
}: {
  value: MetricStyle['valuePosition'];
  onChange: (position: MetricStyle['valuePosition']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.primaryPosition', {
    defaultMessage: 'Primary position',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.lens.metric.toolbarTitlesText.primaryPositionTip', {
              defaultMessage: 'Position of the Primary metric',
            })}
            iconProps={{ className: 'eui-alignTop' }}
            color="subdued"
            position="top"
            size="s"
            type="question"
          />
        </span>
      }
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-primary-position-btn"
        buttonSize="compressed"
        idSelected={value}
        options={primaryPositionModes}
        onChange={(position) => {
          onChange(position as MetricStyle['valuePosition']);
        }}
      />
    </EuiFormRow>
  );
}
