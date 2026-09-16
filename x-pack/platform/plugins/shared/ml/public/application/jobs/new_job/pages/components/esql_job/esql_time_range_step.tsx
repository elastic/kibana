/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSuperDatePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEsqlWizardContext } from './esql_wizard_context';

export const EsqlTimeRangeStep = () => {
  const {
    state: { wizardStart, wizardEnd },
    setTimeRange,
  } = useEsqlWizardContext();

  return (
    <EuiFormRow
      label={i18n.translate('xpack.ml.esqlJob.timeRange.timeRangeLabel', {
        defaultMessage: 'Time range',
      })}
      fullWidth
    >
      <EuiSuperDatePicker
        start={wizardStart}
        end={wizardEnd}
        onTimeChange={({ start, end, isInvalid }) => {
          if (isInvalid) return;

          setTimeRange({ start, end });
        }}
        showUpdateButton={false}
        data-test-subj="mlEsqlTimeRange"
      />
    </EuiFormRow>
  );
};
