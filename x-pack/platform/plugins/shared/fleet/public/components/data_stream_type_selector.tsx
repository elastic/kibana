/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const OPTIONS = [
  {
    id: 'logs',
    label: i18n.translate('xpack.fleet.dataStreamTypeSelector.logs', { defaultMessage: 'Logs' }),
  },
  {
    id: 'metrics',
    label: i18n.translate('xpack.fleet.dataStreamTypeSelector.metrics', {
      defaultMessage: 'Metrics',
    }),
  },
  {
    id: 'traces',
    label: i18n.translate('xpack.fleet.dataStreamTypeSelector.traces', {
      defaultMessage: 'Traces',
    }),
  },
];

export interface DataStreamTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helpText?: React.ReactNode;
}

export const DataStreamTypeSelector: React.FC<DataStreamTypeSelectorProps> = ({
  value,
  onChange,
  disabled,
  helpText,
}) => (
  <EuiFormRow
    label={i18n.translate('xpack.fleet.dataStreamTypeSelector.label', {
      defaultMessage: 'Data Stream Type',
    })}
    helpText={helpText}
  >
    <EuiRadioGroup
      options={OPTIONS}
      idSelected={value}
      onChange={onChange}
      disabled={disabled}
      name="dataStreamType"
      data-test-subj="packagePolicyDataStreamType"
    />
  </EuiFormRow>
);
