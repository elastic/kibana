/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { FormValues, ThresholdConditionOperator } from '../types';
import { useRuleFormMeta } from '../contexts';
import { isCompleteThresholdStatRow } from '../utils/build_threshold_evaluation_query';

const OPERATOR_OPTIONS: Array<{ value: ThresholdConditionOperator; text: string }> = [
  {
    value: 'gt',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdAlertConditions.op.gt', {
      defaultMessage: 'is above',
    }),
  },
  {
    value: 'lt',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdAlertConditions.op.lt', {
      defaultMessage: 'is below',
    }),
  },
  {
    value: 'gte',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdAlertConditions.op.gte', {
      defaultMessage: 'is at or above',
    }),
  },
  {
    value: 'lte',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdAlertConditions.op.lte', {
      defaultMessage: 'is at or below',
    }),
  },
  {
    value: 'eq',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdAlertConditions.op.eq', {
      defaultMessage: 'equals',
    }),
  },
  {
    value: 'neq',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdAlertConditions.op.neq', {
      defaultMessage: 'does not equal',
    }),
  },
];

const VALUE_PLACEHOLDER = i18n.translate(
  'xpack.alertingV2.ruleForm.thresholdAlertConditions.valuePlaceholder',
  {
    defaultMessage: 'Type text',
  }
);

export const ThresholdAlertConditionsField = () => {
  const { layout } = useRuleFormMeta();
  const { control, register } = useFormContext<FormValues>();
  const thresholdStats = useWatch({ control, name: 'thresholdStats' });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'thresholdConditions',
  });

  const compressed = layout === 'flyout';

  const statOptions = useMemo(() => {
    const rows = thresholdStats ?? [];
    const seen = new Set<string>();
    const out: Array<{ value: string; text: string }> = [];
    for (const r of rows) {
      if (!r || !isCompleteThresholdStatRow(r)) {
        continue;
      }
      const label = r.label.trim();
      if (!label.length || seen.has(label)) {
        continue;
      }
      seen.add(label);
      out.push({ value: label, text: label });
    }
    return out;
  }, [thresholdStats]);

  const statSelectOptions = useMemo(() => {
    const empty = {
      value: '',
      text: i18n.translate('xpack.alertingV2.ruleForm.thresholdAlertConditions.statPlaceholder', {
        defaultMessage: 'Select a stat',
      }),
    };
    return [empty, ...statOptions];
  }, [statOptions]);

  const addLabel = i18n.translate(
    'xpack.alertingV2.ruleForm.thresholdAlertConditions.addAnotherCondition',
    {
      defaultMessage: 'Add another condition',
    }
  );

  const sectionTitle = i18n.translate(
    'xpack.alertingV2.ruleForm.thresholdAlertConditions.triggerSectionTitle',
    {
      defaultMessage: 'Trigger condition',
    }
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>{sectionTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      {fields.map((field, index) => (
        <Fragment key={field.id}>
          {index > 0 ? <EuiHorizontalRule margin="m" /> : null}
          <div
            style={{
              position: 'relative',
              ...(fields.length > 1 ? { paddingInlineEnd: 36 } : {}),
            }}
          >
            {fields.length > 1 ? (
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.alertingV2.ruleForm.thresholdAlertConditions.removeCondition',
                  {
                    defaultMessage: 'Remove condition',
                  }
                )}
                iconType="cross"
                size="s"
                color="danger"
                display="empty"
                style={{ position: 'absolute', insetInlineEnd: 0, top: 0 }}
                onClick={() => remove(index)}
              />
            ) : null}
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={true}>
              <EuiFlexItem grow={2}>
                <EuiFormRow
                  label={
                    index === 0
                      ? i18n.translate(
                          'xpack.alertingV2.ruleForm.thresholdAlertConditions.labelColumn',
                          {
                            defaultMessage: 'label',
                          }
                        )
                      : undefined
                  }
                  fullWidth
                >
                  <EuiSelect
                    fullWidth
                    compressed={compressed}
                    options={statSelectOptions}
                    {...register(`thresholdConditions.${index}.statLabel` as const)}
                    disabled={statOptions.length === 0}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <EuiFormRow
                  label={
                    index === 0
                      ? i18n.translate(
                          'xpack.alertingV2.ruleForm.thresholdAlertConditions.operatorColumn',
                          {
                            defaultMessage: 'operator',
                          }
                        )
                      : undefined
                  }
                  fullWidth
                >
                  <EuiSelect
                    fullWidth
                    compressed={compressed}
                    options={OPERATOR_OPTIONS}
                    {...register(`thresholdConditions.${index}.operator` as const)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiFormRow
                  label={
                    index === 0
                      ? i18n.translate(
                          'xpack.alertingV2.ruleForm.thresholdAlertConditions.valueColumn',
                          {
                            defaultMessage: 'value',
                          }
                        )
                      : undefined
                  }
                  fullWidth
                >
                  <EuiFieldText
                    fullWidth
                    compressed={compressed}
                    placeholder={VALUE_PLACEHOLDER}
                    {...register(`thresholdConditions.${index}.value` as const)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </Fragment>
      ))}

      <EuiSpacer size="s" />
      <EuiButtonEmpty
        color="text"
        iconType="plusInCircle"
        size="s"
        data-test-subj="thresholdAlertConditionsAdd"
        onClick={() =>
          append({
            statLabel: '',
            operator: 'gt',
            value: '',
          })
        }
      >
        {addLabel}
      </EuiButtonEmpty>
    </>
  );
};
