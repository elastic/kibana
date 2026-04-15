/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const CARD_ID = 'ruleV2KindField';

const KIND_FIELD_TOOLTIP = i18n.translate('xpack.alertingV2.ruleForm.kindField.tooltip', {
  defaultMessage:
    'Enables lifecycle management: the system will track state transitions across alert events for each series, manage episodes, and dispatch to notification policies. Without this, alert events are observation-only records.',
});

const KIND_FIELD_TOOLTIP_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.ruleForm.kindField.tooltipAriaLabel',
  {
    defaultMessage: 'More information about tracking active and recovered state over time',
  }
);

export const KindField = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="kind"
      control={control}
      render={({ field: { value, onChange } }) => {
        const isChecked = value === 'alert';

        return (
          <EuiCheckableCard
            id={CARD_ID}
            checkableType="checkbox"
            label={
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <strong>
                    {i18n.translate('xpack.alertingV2.ruleForm.kindField.checkboxLabel', {
                      defaultMessage: 'Track active and recovered state over time',
                    })}
                  </strong>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <EuiIconTip
                      type="info"
                      content={KIND_FIELD_TOOLTIP}
                      aria-label={KIND_FIELD_TOOLTIP_ARIA_LABEL}
                      iconProps={{ 'data-test-subj': 'kindFieldTooltip' }}
                    />
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            checked={isChecked}
            onChange={() => onChange(isChecked ? 'signal' : 'alert')}
            data-test-subj="kindField"
          />
        );
      }}
    />
  );
};
