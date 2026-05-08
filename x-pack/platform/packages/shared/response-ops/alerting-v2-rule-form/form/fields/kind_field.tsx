/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';

const CARD_ID = 'ruleV2KindField';

interface KindOption {
  value: RuleKind;
  label: string;
  description: string;
}

const KIND_OPTIONS: KindOption[] = [
  {
    value: 'signal',
    label: i18n.translate('xpack.alertingV2.ruleForm.kindField.signalLabel', {
      defaultMessage: 'Signal',
    }),
    description: i18n.translate('xpack.alertingV2.ruleForm.kindField.signalDescription', {
      defaultMessage:
        'Each match is an independent observation record. No episode lifecycle or state tracking.',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('xpack.alertingV2.ruleForm.kindField.alertLabel', {
      defaultMessage: 'Alert',
    }),
    description: i18n.translate('xpack.alertingV2.ruleForm.kindField.alertDescription', {
      defaultMessage:
        'Tracks state transitions across runs. The system manages episode lifecycle and dispatches to action policies.',
    }),
  },
  {
    value: 'building_block',
    label: i18n.translate('xpack.alertingV2.ruleForm.kindField.buildingBlockLabel', {
      defaultMessage: 'Building block',
    }),
    description: i18n.translate('xpack.alertingV2.ruleForm.kindField.buildingBlockDescription', {
      defaultMessage:
        'Runs silently and produces signals hidden from the default SIEM alerts view. Use as inputs for other detection rules.',
    }),
  },
];

export const KindField = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      name="kind"
      control={control}
      render={({ field: { value, onChange } }) => (
        <EuiFlexGroup gutterSize="m" direction="column">
          {KIND_OPTIONS.map((option) => (
            <EuiFlexItem key={option.value}>
              <EuiCheckableCard
                id={`${CARD_ID}_${option.value}`}
                name={CARD_ID}
                checkableType="radio"
                label={<strong>{option.label}</strong>}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                data-test-subj={`kindField-${option.value}`}
              >
                <EuiText size="s" color="subdued">
                  {option.description}
                </EuiText>
              </EuiCheckableCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    />
  );
};
