/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleKind } from '@kbn/alerting-v2-schemas';

interface ModeSelectProps {
  value: RuleKind;
  onChange: (kind: RuleKind) => void;
  disabled?: boolean;
  'data-test-subj'?: string;
}

const LABEL_TEXT = i18n.translate('xpack.alertingV2.ruleForm.modeField.label', {
  defaultMessage: 'Mode',
});

const ALERT_TITLE = i18n.translate('xpack.alertingV2.ruleForm.modeField.alert.title', {
  defaultMessage: 'Alert',
});

const SIGNAL_TITLE = i18n.translate('xpack.alertingV2.ruleForm.modeField.signal.title', {
  defaultMessage: 'Signal',
});

const ALERT_DESCRIPTION = i18n.translate('xpack.alertingV2.ruleForm.modeField.alert.description', {
  defaultMessage:
    'Tracks a problem across state changes and can notify your team or trigger automated actions when the state changes. Choose this to monitor ongoing issues.',
});

const SIGNAL_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.modeField.signal.description',
  {
    defaultMessage:
      'Records each match as a data point without lifecycle tracking or notifications. Choose this to capture activity for querying and investigation.',
  }
);

const MODE_OPTIONS: Array<{
  value: RuleKind;
  title: string;
  description: string;
}> = [
  {
    value: 'alert',
    title: ALERT_TITLE,
    description: ALERT_DESCRIPTION,
  },
  {
    value: 'signal',
    title: SIGNAL_TITLE,
    description: SIGNAL_DESCRIPTION,
  },
];

/**
 * Presentational Mode select. Switches a rule between `alert` (stateful lifecycle)
 * and `signal` (stateless detection) modes. Uses radio-style checkable cards so the
 * consequence of each mode is legible before the user commits (and so #812 can lift
 * this control onto the Outcome step with minimal churn).
 */
export const ModeSelect = ({
  value,
  onChange,
  disabled = false,
  'data-test-subj': dataTestSubj = 'ruleV2ModeSelect',
}: ModeSelectProps) => {
  const radioGroupId = useGeneratedHtmlId({ prefix: 'ruleV2ModeSelect' });

  return (
    <EuiFormRow label={LABEL_TEXT} fullWidth data-test-subj={dataTestSubj}>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        role="radiogroup"
        aria-label={LABEL_TEXT}
        id={radioGroupId}
      >
        {MODE_OPTIONS.map((option) => {
          const optionId = `${radioGroupId}-${option.value}`;
          return (
            <EuiFlexItem key={option.value} grow={false}>
              <EuiCheckableCard
                id={optionId}
                data-test-subj={`${dataTestSubj}-${option.value}`}
                label={
                  <>
                    <EuiText size="s">
                      <strong>{option.title}</strong>
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued">
                      {option.description}
                    </EuiText>
                  </>
                }
                checkableType="radio"
                name={radioGroupId}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
