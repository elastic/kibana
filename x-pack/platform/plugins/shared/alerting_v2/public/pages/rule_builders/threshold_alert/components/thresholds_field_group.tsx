/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { SectionWrapper } from '../../shared/components/section_wrapper';
import {
  Comparator,
  COMPARATOR_LABELS,
  DEFAULT_ALERT_CONDITION,
  type ThresholdRuleFormValues,
  type ConditionOperator,
} from '../types';

const COMPARATOR_OPTIONS = Object.entries(COMPARATOR_LABELS).map(([value, text]) => ({
  value,
  text,
}));

const OPERATOR_OPTIONS = [
  {
    id: 'AND',
    label: i18n.translate(
      'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.operatorAnd',
      {
        defaultMessage: 'AND',
      }
    ),
  },
  {
    id: 'OR',
    label: i18n.translate(
      'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.operatorOr',
      {
        defaultMessage: 'OR',
      }
    ),
  },
];

const generateId = () => `ac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface AlertConditionRowProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  metricOptions: Array<{ value: string; text: string }>;
}

const AlertConditionRow = ({
  index,
  onRemove,
  canRemove,
  metricOptions,
}: AlertConditionRowProps) => {
  const { control, watch } = useFormContext<ThresholdRuleFormValues>();
  const comparator = watch(`alertConditions.${index}.comparator`);
  const isBetween = comparator === Comparator.BETWEEN || comparator === Comparator.NOT_BETWEEN;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexEnd" wrap>
      <EuiFlexItem grow={2}>
        <Controller
          name={`alertConditions.${index}.metric`}
          control={control}
          rules={{
            required: i18n.translate(
              'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.metricRequired',
              { defaultMessage: 'Metric is required.' }
            ),
          }}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.metricLabel',
                { defaultMessage: 'Metric (stat or evaluation)' }
              )}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiSelect
                options={metricOptions}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                fullWidth
                isInvalid={!!error}
                data-test-subj={`alertConditionMetric-${index}`}
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <Controller
          name={`alertConditions.${index}.comparator`}
          control={control}
          render={({ field }) => (
            <EuiFormRow
              label={i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.comparatorLabel',
                { defaultMessage: 'Condition' }
              )}
              fullWidth
            >
              <EuiSelect
                options={COMPARATOR_OPTIONS}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                fullWidth
                data-test-subj={`alertConditionComparator-${index}`}
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <Controller
          name={`alertConditions.${index}.threshold.0`}
          control={control}
          rules={{
            required: i18n.translate(
              'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.thresholdRequired',
              { defaultMessage: 'Threshold is required.' }
            ),
          }}
          render={({ field, fieldState }) => (
            <EuiFormRow
              label={
                isBetween
                  ? i18n.translate(
                      'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.fromLabel',
                      { defaultMessage: 'From' }
                    )
                  : i18n.translate(
                      'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.thresholdLabel',
                      { defaultMessage: 'Threshold' }
                    )
              }
              isInvalid={!!fieldState.error}
              error={fieldState.error?.message}
              fullWidth
            >
              <EuiFieldNumber
                value={field.value ?? ''}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                fullWidth
                isInvalid={!!fieldState.error}
                data-test-subj={`alertConditionValue-${index}`}
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>

      {isBetween && (
        <EuiFlexItem grow={1}>
          <Controller
            name={`alertConditions.${index}.threshold.1`}
            control={control}
            rules={{
              required: i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.toRequired',
                { defaultMessage: 'Upper bound is required.' }
              ),
            }}
            render={({ field, fieldState }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.toLabel',
                  { defaultMessage: 'To' }
                )}
                isInvalid={!!fieldState.error}
                error={fieldState.error?.message}
                fullWidth
              >
                <EuiFieldNumber
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  fullWidth
                  isInvalid={!!fieldState.error}
                  data-test-subj={`alertConditionValueTo-${index}`}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
      )}

      {canRemove && (
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.removeCondition',
                { defaultMessage: 'Remove condition' }
              )}
              onClick={onRemove}
              data-test-subj={`alertConditionRemove-${index}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const ThresholdsFieldGroup = () => {
  const { control, getValues, setValue } = useFormContext<ThresholdRuleFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'alertConditions' });

  const stats = useWatch({ control, name: 'stats' });
  const evaluations = useWatch({ control, name: 'evaluations' });

  const metricOptions = useMemo(() => {
    const evalOptions = (evaluations ?? [])
      .filter((e) => e.label?.trim() && e.expression?.trim())
      .map((e) => ({ value: e.label, text: e.label }));

    const statOptions = (stats ?? [])
      .filter((s) => s.label?.trim())
      .map((s) => ({ value: s.label, text: s.label }));

    return [...evalOptions, ...statOptions];
  }, [stats, evaluations]);

  useEffect(() => {
    if (metricOptions.length === 0) return;
    const validValues = new Set(metricOptions.map((o) => o.value));
    const conditions = getValues('alertConditions');
    conditions.forEach((c, ci) => {
      if (!validValues.has(c.metric)) {
        setValue(`alertConditions.${ci}.metric`, metricOptions[0].value);
      }
    });
  }, [metricOptions, getValues, setValue]);

  const handleAdd = useCallback(() => {
    const defaultMetric = metricOptions.length > 0 ? metricOptions[0].value : '';
    append({
      ...DEFAULT_ALERT_CONDITION,
      id: generateId(),
      metric: defaultMetric,
    });
  }, [append, metricOptions]);

  return (
    <SectionWrapper
      title={i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.title', {
        defaultMessage: 'Threshold conditions',
      })}
      defaultOpen
    >
      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && (
            <>
              <EuiHorizontalRule margin="s" />
              <Controller
                name="conditionOperator"
                control={control}
                render={({ field }) => (
                  <EuiButtonGroup
                    legend={i18n.translate(
                      'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.operatorLegend',
                      { defaultMessage: 'Condition operator' }
                    )}
                    options={OPERATOR_OPTIONS}
                    idSelected={field.value}
                    onChange={(id) => field.onChange(id as ConditionOperator)}
                    buttonSize="compressed"
                    data-test-subj="alertConditionOperator"
                  />
                )}
              />
              <EuiSpacer size="s" />
            </>
          )}
          <AlertConditionRow
            index={index}
            onRemove={() => remove(index)}
            canRemove={fields.length > 1}
            metricOptions={metricOptions}
          />
        </React.Fragment>
      ))}

      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={handleAdd}
        size="xs"
        color="text"
        data-test-subj="alertConditionAdd"
      >
        {i18n.translate(
          'xpack.alertingV2.ruleBuilder.thresholdAlert.alertConditions.addCondition',
          {
            defaultMessage: 'Add threshold condition',
          }
        )}
      </EuiButtonEmpty>
    </SectionWrapper>
  );
};
