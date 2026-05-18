/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { SectionWrapper } from '../../shared/components/section_wrapper';
import { FilterInput } from '../../shared/components/filter_input';
import type { IndexColumn } from '../../shared/hooks/use_index_columns';
import {
  Aggregation,
  AGGREGATION_LABELS,
  AGGREGATIONS_REQUIRING_FIELD,
  DEFAULT_STAT,
  deriveStatLabel,
  type ThresholdRuleFormValues,
} from '../types';

const AGGREGATION_OPTIONS = Object.entries(AGGREGATION_LABELS).map(([value, text]) => ({
  value,
  text,
}));

const generateId = () => `stat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface StatRowProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  numericColumns: IndexColumn[];
  isColumnsLoading: boolean;
}

const StatRow = ({
  index,
  onRemove,
  canRemove,
  numericColumns,
  isColumnsLoading,
}: StatRowProps) => {
  const { control, watch, setValue, getValues } = useFormContext<ThresholdRuleFormValues>();
  const aggregation = watch(`stats.${index}.aggregation`);
  const field = watch(`stats.${index}.field`);
  const label = watch(`stats.${index}.label`);
  const requiresField = AGGREGATIONS_REQUIRING_FIELD.includes(aggregation);
  const prevLabelRef = useRef(label);
  const [isLabelManuallyEdited, setIsLabelManuallyEdited] = useState(false);

  useEffect(() => {
    if (isLabelManuallyEdited) return;

    const allStats = getValues('stats');
    const otherLabels = allStats.filter((_: unknown, i: number) => i !== index).map((s) => s.label);
    const newLabel = deriveStatLabel(aggregation, field, otherLabels);
    if (newLabel !== label) {
      const oldLabel = prevLabelRef.current;
      setValue(`stats.${index}.label`, newLabel);
      prevLabelRef.current = newLabel;

      const conditions = getValues('alertConditions');
      conditions.forEach((c, ci) => {
        if (c.metric === oldLabel) {
          setValue(`alertConditions.${ci}.metric`, newLabel);
        }
      });
    }
  }, [aggregation, field, index, label, getValues, setValue, isLabelManuallyEdited]);

  useEffect(() => {
    prevLabelRef.current = label;
  }, [label]);

  const fieldOptions = useMemo(
    () => numericColumns.map((col) => ({ label: col.name, value: col.name })),
    [numericColumns]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="flexEnd" wrap>
        <EuiFlexItem grow={1} style={{ maxWidth: 160 }}>
          <Controller
            name={`stats.${index}.label`}
            control={control}
            rules={{
              required: i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.labelRequired',
                { defaultMessage: 'Label is required.' }
              ),
              pattern: {
                value: /^[A-Za-z_][A-Za-z0-9_]*$/,
                message: i18n.translate(
                  'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.labelPattern',
                  { defaultMessage: 'Letters, numbers, and underscores only.' }
                ),
              },
            }}
            render={({ field: formField, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.labelLabel',
                  {
                    defaultMessage: 'Label',
                  }
                )}
                isInvalid={!!error}
                error={error?.message}
                fullWidth
              >
                <EuiFieldText
                  value={formField.value}
                  onChange={(e) => {
                    const oldLabel = prevLabelRef.current;
                    const newVal = e.target.value;
                    setIsLabelManuallyEdited(true);
                    formField.onChange(newVal);
                    prevLabelRef.current = newVal;

                    const conditions = getValues('alertConditions');
                    conditions.forEach((c, ci) => {
                      if (c.metric === oldLabel) {
                        setValue(`alertConditions.${ci}.metric`, newVal);
                      }
                    });
                  }}
                  onBlur={formField.onBlur}
                  fullWidth
                  isInvalid={!!error}
                  data-test-subj={`statLabel-${index}`}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <Controller
            name={`stats.${index}.aggregation`}
            control={control}
            render={({ field: formField }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.aggregationLabel',
                  { defaultMessage: 'Aggregation' }
                )}
                fullWidth
              >
                <EuiSelect
                  options={AGGREGATION_OPTIONS}
                  value={formField.value}
                  onChange={(e) => {
                    formField.onChange(e.target.value);
                    if (!AGGREGATIONS_REQUIRING_FIELD.includes(e.target.value as Aggregation)) {
                      setValue(`stats.${index}.field`, undefined);
                    }
                  }}
                  fullWidth
                  data-test-subj={`statAggregation-${index}`}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>

        {requiresField && (
          <EuiFlexItem grow={2}>
            <Controller
              name={`stats.${index}.field`}
              control={control}
              rules={{
                required: i18n.translate(
                  'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.fieldRequired',
                  { defaultMessage: 'Field is required for this aggregation.' }
                ),
              }}
              render={({ field: formField, fieldState }) => (
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.fieldLabel',
                    { defaultMessage: 'Field' }
                  )}
                  isInvalid={!!fieldState.error}
                  error={fieldState.error?.message}
                  fullWidth
                >
                  <EuiComboBox
                    singleSelection={{ asPlainText: true }}
                    options={fieldOptions}
                    selectedOptions={formField.value ? [{ label: formField.value }] : []}
                    onChange={(options) =>
                      formField.onChange(options.length > 0 ? options[0].label : '')
                    }
                    onCreateOption={(value) => {
                      const trimmed = value.trim();
                      if (trimmed) formField.onChange(trimmed);
                    }}
                    isLoading={isColumnsLoading}
                    fullWidth
                    data-test-subj={`statField-${index}`}
                    isInvalid={!!fieldState.error}
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
                  'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.removeStat',
                  { defaultMessage: 'Remove stat' }
                )}
                onClick={onRemove}
                data-test-subj={`statRemove-${index}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <Controller
        name={`stats.${index}.filter`}
        control={control}
        render={({ field: { value, onChange, onBlur } }) => (
          <FilterInput
            value={value ?? ''}
            onChange={onChange}
            onBlur={onBlur}
            label={i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.stats.filterLabel', {
              defaultMessage: 'Filter',
            })}
            placeholder={i18n.translate(
              'xpack.alertingV2.ruleBuilder.thresholdAlert.stats.filterPlaceholder',
              { defaultMessage: 'e.g. status >= 400' }
            )}
            data-test-subj={`statFilter-${index}`}
          />
        )}
      />
    </>
  );
};

interface StatsFieldGroupProps {
  numericColumns: IndexColumn[];
  isColumnsLoading: boolean;
}

export const StatsFieldGroup = ({ numericColumns, isColumnsLoading }: StatsFieldGroupProps) => {
  const { control, getValues } = useFormContext<ThresholdRuleFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'stats' });

  const handleAdd = useCallback(() => {
    const existingLabels = getValues('stats').map((s) => s.label);
    const newLabel = deriveStatLabel(Aggregation.COUNT, undefined, existingLabels);
    append({
      ...DEFAULT_STAT,
      id: generateId(),
      label: newLabel,
    });
  }, [append, getValues]);

  return (
    <SectionWrapper
      title={i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.stats.title', {
        defaultMessage: 'Stats',
      })}
      defaultOpen
    >
      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <EuiHorizontalRule margin="s" />}
          <StatRow
            index={index}
            onRemove={() => remove(index)}
            canRemove={fields.length > 1}
            numericColumns={numericColumns}
            isColumnsLoading={isColumnsLoading}
          />
        </React.Fragment>
      ))}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={handleAdd}
        size="xs"
        color="text"
        data-test-subj="statAdd"
      >
        {i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.stats.addStat', {
          defaultMessage: 'Add stat',
        })}
      </EuiButtonEmpty>
    </SectionWrapper>
  );
};
