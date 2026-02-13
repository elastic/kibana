/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

export type KindType = 'signal' | 'alert';

// UI selection maps to form value
type KindSelection = 'monitor' | 'alert';

const KIND_OPTIONS: Array<{ id: KindSelection; label: string }> = [
  {
    id: 'alert',
    label: i18n.translate('xpack.alertingV2.ruleForm.kindField.alertOption', {
      defaultMessage: 'Alert',
    }),
  },
  {
    id: 'monitor',
    label: i18n.translate('xpack.alertingV2.ruleForm.kindField.monitorOption', {
      defaultMessage: 'Monitor',
    }),
  },
];

// Maps UI selection to form value
const selectionToKind: Record<KindSelection, KindType> = {
  monitor: 'signal',
  alert: 'alert',
};

// Maps form value to UI selection
const kindToSelection: Record<KindType, KindSelection> = {
  signal: 'monitor',
  alert: 'alert',
};

export const KindField: React.FC = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="kind"
      control={control}
      render={({ field: { value, onChange, ref }, fieldState: { error } }) => {
        const selectedId = value ? kindToSelection[value] : 'monitor';

        const handleChange = (id: string) => {
          const selection = id as KindSelection;
          onChange(selectionToKind[selection]);
        };

        return (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.kindLabel', {
              defaultMessage: 'Rule kind',
            })}
            helpText={i18n.translate('xpack.alertingV2.ruleForm.kindHelpText', {
              defaultMessage: 'Choose whether this rule creates monitors or alerts.',
            })}
            isInvalid={!!error}
            error={error?.message}
          >
            <div ref={ref}>
              <EuiButtonGroup
                legend={i18n.translate('xpack.alertingV2.ruleForm.kindField.legend', {
                  defaultMessage: 'Rule kind',
                })}
                options={KIND_OPTIONS}
                idSelected={selectedId}
                onChange={handleChange}
                buttonSize="m"
                color="primary"
                isFullWidth
                data-test-subj="kindField"
              />
            </div>
          </EuiFormRow>
        );
      }}
    />
  );
};
