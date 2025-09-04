/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { MetricStyle } from '@elastic/charts';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';

const titleWeightOptions: Array<{
  id: MetricStyle['titleWeight'];
  label: string;
}> = [
  {
    id: 'normal',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.normal', {
      defaultMessage: 'Normal',
    }),
  },
  {
    id: 'bold',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.bold', {
      defaultMessage: 'Bold',
    }),
  },
];

export function TitleWeightOption({
  value,
  onChange,
}: {
  value: MetricStyle['titleWeight'];
  onChange: (position: MetricStyle['titleWeight']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.titleWeightPosition', {
    defaultMessage: 'Title style',
  });

  return (
    <EuiFormRow display="columnCompressed" label={label}>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-title-weight-btn"
        buttonSize="compressed"
        idSelected={value}
        options={titleWeightOptions}
        onChange={(option) => {
          onChange(option as MetricStyle['titleWeight']);
        }}
      />
    </EuiFormRow>
  );
}
