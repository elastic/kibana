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
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { FormValues, ThresholdAggregation } from '../types';
import { useRuleFormMeta } from '../contexts';

const AGGREGATION_OPTIONS: Array<{ value: ThresholdAggregation; text: string }> = [
  {
    value: 'avg',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.avg', {
      defaultMessage: 'Average',
    }),
  },
  {
    value: 'max',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.max', {
      defaultMessage: 'Max',
    }),
  },
  {
    value: 'min',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.min', {
      defaultMessage: 'Min',
    }),
  },
  {
    value: 'sum',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.sum', {
      defaultMessage: 'Sum',
    }),
  },
  {
    value: 'p95',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.p95', {
      defaultMessage: 'P95',
    }),
  },
  {
    value: 'p99',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.p99', {
      defaultMessage: 'P99',
    }),
  },
  {
    value: 'count',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.count', {
      defaultMessage: 'Count',
    }),
  },
  {
    value: 'cardinality',
    text: i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.agg.cardinality', {
      defaultMessage: 'Cardinality',
    }),
  },
];

export const ThresholdStatsField = () => {
  const { layout } = useRuleFormMeta();
  const { control, register } = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'thresholdStats',
  });

  const compressed = layout === 'flyout';

  const addButtonLabel = useMemo(
    () =>
      i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.addAnotherStats', {
        defaultMessage: 'Add another stats',
      }),
    []
  );

  const statsTitle = i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.sectionTitleStats', {
    defaultMessage: 'Stats',
    description: 'Section heading in the threshold rule builder for aggregation rows (STATS in ES|QL).',
  });

  return (
    <>
      <EuiTitle size="xs">
        <h3>{statsTitle}</h3>
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
                aria-label={i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.removeStat', {
                  defaultMessage: 'Remove stat',
                })}
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
                  label={i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.labelColumn', {
                    defaultMessage: 'label',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    fullWidth
                    compressed={compressed}
                    {...register(`thresholdStats.${index}.label` as const)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.alertingV2.ruleForm.thresholdStats.aggregationColumn',
                    {
                      defaultMessage: 'aggregation',
                    }
                  )}
                  fullWidth
                >
                  <EuiSelect
                    fullWidth
                    compressed={compressed}
                    options={AGGREGATION_OPTIONS}
                    {...register(`thresholdStats.${index}.aggregation` as const)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={5}>
                <EuiFormRow
                  label={i18n.translate('xpack.alertingV2.ruleForm.thresholdStats.fieldColumn', {
                    defaultMessage: 'field',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    fullWidth
                    compressed={compressed}
                    {...register(`thresholdStats.${index}.field` as const)}
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
        onClick={() =>
          append({
            label: '',
            aggregation: 'avg',
            field: '',
          })
        }
      >
        {addButtonLabel}
      </EuiButtonEmpty>
    </>
  );
};
