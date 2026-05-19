/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiIconTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const CARD_ID = 'ruleV2KindField';

interface KindFieldProps {
  disabled?: boolean;
  compact?: boolean;
}

const LABEL_TEXT = i18n.translate('xpack.alertingV2.ruleForm.kindField.checkboxLabel', {
  defaultMessage: 'Track active and recovered state over time',
});

export const KindField = ({ disabled = false, compact = false }: KindFieldProps) => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="kind"
      control={control}
      render={({ field: { value, onChange } }) => {
        const isChecked = value === 'alert';

        if (compact) {
          return (
            <EuiCheckableCard
              id={CARD_ID}
              checkableType="checkbox"
              label={
                <>
                  {LABEL_TEXT}{' '}
                  <EuiIconTip
                    type="info"
                    position="top"
                    content={i18n.translate(
                      'xpack.alertingV2.ruleForm.kindField.tooltipDescription',
                      {
                        defaultMessage:
                          'Enables lifecycle management: the system will track state transitions across alert events for each series, manage episodes, and dispatch to action policies. Without this, alert events are observation-only records.',
                      }
                    )}
                  />
                </>
              }
              checked={isChecked}
              onChange={() => onChange(isChecked ? 'signal' : 'alert')}
              disabled={disabled}
              data-test-subj="kindField"
            />
          );
        }

        return (
          <EuiCheckableCard
            id={CARD_ID}
            checkableType="checkbox"
            label={<strong>{LABEL_TEXT}</strong>}
            checked={isChecked}
            onChange={() => onChange(isChecked ? 'signal' : 'alert')}
            disabled={disabled}
            data-test-subj="kindField"
          >
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.alertingV2.ruleForm.kindField.checkboxDescription', {
                defaultMessage:
                  'Enables lifecycle management: the system will track state transitions across alert events for each series, manage episodes, and dispatch to action policies. Without this, alert events are observation-only records.',
              })}
            </EuiText>
          </EuiCheckableCard>
        );
      }}
    />
  );
};
