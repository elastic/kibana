/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { SectionWrapper } from '../../shared/components/section_wrapper';
import type { ThresholdRuleFormValues } from '../types';

const generateId = () => `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface EvaluationRowProps {
  index: number;
  onRemove: () => void;
}

const EvaluationRow = ({ index, onRemove }: EvaluationRowProps) => {
  const { control } = useFormContext<ThresholdRuleFormValues>();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem style={{ maxWidth: 160 }}>
        <Controller
          name={`evaluations.${index}.label`}
          control={control}
          rules={{
            required: i18n.translate(
              'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.labelRequired',
              { defaultMessage: 'Label is required.' }
            ),
            pattern: {
              value: /^[A-Za-z_][A-Za-z0-9_]*$/,
              message: i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.labelPattern',
                { defaultMessage: 'Letters, numbers, and underscores only.' }
              ),
            },
          }}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.labelLabel',
                { defaultMessage: 'Label' }
              )}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiFieldText
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                fullWidth
                isInvalid={!!error}
                data-test-subj={`evalLabel-${index}`}
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiText size="s" style={{ lineHeight: '32px' }}>
            =
          </EuiText>
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <Controller
          name={`evaluations.${index}.expression`}
          control={control}
          rules={{
            required: i18n.translate(
              'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.expressionRequired',
              { defaultMessage: 'Expression is required.' }
            ),
          }}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate(
                'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.expressionLabel',
                { defaultMessage: 'Expression' }
              )}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiFieldText
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={i18n.translate(
                  'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.expressionPlaceholder',
                  { defaultMessage: 'e.g. A / B * 100' }
                )}
                fullWidth
                isInvalid={!!error}
                data-test-subj={`evalExpression-${index}`}
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label={i18n.translate(
              'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.removeEvaluation',
              { defaultMessage: 'Remove evaluation' }
            )}
            onClick={onRemove}
            data-test-subj={`evalRemove-${index}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EvaluationsFieldGroup = () => {
  const { control } = useFormContext<ThresholdRuleFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'evaluations' });
  const stats = useWatch({ control, name: 'stats' });

  const availableLabels = (stats ?? []).map((s) => s.label).filter(Boolean);

  const handleAdd = useCallback(() => {
    append({
      id: generateId(),
      label: '',
      expression: '',
    });
  }, [append]);

  return (
    <SectionWrapper
      title={i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.title', {
        defaultMessage: 'Evaluations',
      })}
      defaultOpen
    >
      {availableLabels.length > 0 && (
        <>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.availableStats',
              {
                defaultMessage: 'Available stats: {labels}',
                values: { labels: availableLabels.join(', ') },
              }
            )}
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {fields.length === 0 && (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.empty', {
            defaultMessage:
              'No evaluations defined. Threshold conditions will apply directly to stats.',
          })}
        </EuiText>
      )}

      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <EuiHorizontalRule margin="s" />}
          <EvaluationRow index={index} onRemove={() => remove(index)} />
        </React.Fragment>
      ))}

      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        onClick={handleAdd}
        size="xs"
        color="text"
        data-test-subj="evalAdd"
      >
        {i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.evaluations.addEvaluation', {
          defaultMessage: 'Add evaluation',
        })}
      </EuiButtonEmpty>
    </SectionWrapper>
  );
};
