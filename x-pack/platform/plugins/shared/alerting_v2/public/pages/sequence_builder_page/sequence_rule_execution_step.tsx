/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ScheduleField,
  LookbackWindow,
  formatLookbackString,
  getCommonGroupingFields,
  totalLookbackSeconds,
} from '@kbn/alerting-v2-rule-form';
import type { SequenceFormValues } from '@kbn/alerting-v2-rule-form';

export interface SequenceRuleExecutionStepProps {
  seqValues: SequenceFormValues;
}

export const SequenceRuleExecutionStep: React.FC<SequenceRuleExecutionStepProps> = ({
  seqValues,
}) => {
  const correlatedFields = useMemo(() => getCommonGroupingFields(seqValues), [seqValues]);
  const lookbackString = useMemo(
    () => formatLookbackString(totalLookbackSeconds(seqValues)),
    [seqValues]
  );

  const correlatedSelectedOptions = useMemo(
    () => correlatedFields.map((field) => ({ label: field })),
    [correlatedFields]
  );

  return (
    <div data-test-subj="sequenceBuilderRuleExecutionStep">
      <EuiFormRow
        label={i18n.translate(
          'xpack.alertingV2.sequenceBuilderPage.execution.correlatedFieldsLabel',
          { defaultMessage: 'Correlated fields' }
        )}
        helpText={i18n.translate(
          'xpack.alertingV2.sequenceBuilderPage.execution.correlatedFieldsHelp',
          {
            defaultMessage:
              'Grouping fields shared by every rule in the sequence. When present, the sequence matches per group (for example the same host).',
          }
        )}
        fullWidth
      >
        <EuiComboBox
          fullWidth
          compressed
          isDisabled
          options={correlatedSelectedOptions}
          selectedOptions={correlatedSelectedOptions}
          onChange={() => undefined}
          placeholder={i18n.translate(
            'xpack.alertingV2.sequenceBuilderPage.execution.noCorrelatedFields',
            {
              defaultMessage: 'None — sequence has no matching group by fields',
            }
          )}
          data-test-subj="sequenceBuilderCorrelatedFields"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <ScheduleField />

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.alertingV2.ruleForm.lookbackWindowLabel', {
          defaultMessage: 'Lookback Window',
        })}
        helpText={i18n.translate('xpack.alertingV2.sequenceBuilderPage.execution.lookbackHelp', {
          defaultMessage: 'Derived from the sum of step time windows on the canvas. Not editable.',
        })}
        fullWidth
      >
        {lookbackString ? (
          <LookbackWindow value={lookbackString} onChange={() => undefined} compressed disabled />
        ) : (
          <EuiText size="s" color="subdued" data-test-subj="sequenceBuilderLookbackWindow">
            {i18n.translate('xpack.alertingV2.sequenceBuilderPage.execution.lookbackEmpty', {
              defaultMessage: 'Add at least two steps to derive lookback',
            })}
          </EuiText>
        )}
      </EuiFormRow>
    </div>
  );
};
