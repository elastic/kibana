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
  /**
   * When true, only the currently selected card is rendered (no radio interaction).
   * Used in edit mode where kind is immutable.
   */
  readOnly?: boolean;
  'data-test-subj'?: string;
}

const LABEL_TEXT = i18n.translate('xpack.alertingV2.ruleForm.modeField.label', {
  defaultMessage: "What's your goal?",
});

const ALERT_TITLE = i18n.translate('xpack.alertingV2.ruleForm.modeField.alert.title', {
  defaultMessage: 'Detect and respond',
});

const SIGNAL_TITLE = i18n.translate('xpack.alertingV2.ruleForm.modeField.signal.title', {
  defaultMessage: 'Collect evidence',
});

const ALERT_DESCRIPTION = i18n.translate('xpack.alertingV2.ruleForm.modeField.alert.description', {
  defaultMessage:
    'Tracks each problem as an alert episode and its lifecycle, link it to workflows to notify your team.',
});

const SIGNAL_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.modeField.signal.description',
  {
    defaultMessage:
      'Matches are stored as queryable data points. No alerts, no notifications - just data.',
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

const ModeCardLabel = ({ title, description }: { title: string; description: string }) => (
  <>
    <EuiText size="s">
      <strong>{title}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="xs" color="subdued">
      {description}
    </EuiText>
  </>
);

/**
 * Presentational Mode select. Switches a rule between `alert` (stateful lifecycle)
 * and `signal` (stateless detection) modes. Uses radio-style checkable cards so the
 * consequence of each mode is legible before the user commits.
 */
export const ModeSelect = ({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  'data-test-subj': dataTestSubj = 'ruleV2ModeSelect',
}: ModeSelectProps) => {
  const radioGroupId = useGeneratedHtmlId({ prefix: 'ruleV2ModeSelect' });
  const options = readOnly ? MODE_OPTIONS.filter((option) => option.value === value) : MODE_OPTIONS;

  return (
    <EuiFormRow label={LABEL_TEXT} fullWidth data-test-subj={dataTestSubj}>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        role="radiogroup"
        aria-label={LABEL_TEXT}
        id={radioGroupId}
      >
        {options.map((option) => {
          const optionId = `${radioGroupId}-${option.value}`;
          return (
            <EuiFlexItem key={option.value} grow={false}>
              <EuiCheckableCard
                id={optionId}
                data-test-subj={`${dataTestSubj}-${option.value}`}
                label={<ModeCardLabel title={option.title} description={option.description} />}
                checkableType="radio"
                name={radioGroupId}
                checked={value === option.value}
                disabled={disabled || readOnly}
                onChange={() => onChange(option.value)}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
