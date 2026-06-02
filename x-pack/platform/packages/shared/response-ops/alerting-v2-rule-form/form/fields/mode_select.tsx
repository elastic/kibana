/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleKind } from '@kbn/alerting-v2-schemas';

interface ModeSelectProps {
  value: RuleKind;
  onChange: (kind: RuleKind) => void;
  disabled?: boolean;
  compressed?: boolean;
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

// TODO: finalize description copy with @nastasha-solomon before shipping (see rna-program#530).
const ALERT_DESCRIPTION = i18n.translate('xpack.alertingV2.ruleForm.modeField.alert.description', {
  defaultMessage:
    'Groups rule firings into episodes with a lifecycle (pending → active → recovering → inactive). Supports action policies and notifications on state changes.',
});

const SIGNAL_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.modeField.signal.description',
  {
    defaultMessage:
      'Detection mode: generates one rule event per match, no episodes or lifecycle. Does not trigger action policies or notifications.',
  }
);

const MODE_OPTIONS: Array<{
  value: RuleKind;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
}> = [
  {
    value: 'alert',
    inputDisplay: ALERT_TITLE,
    dropdownDisplay: (
      <>
        <strong>{ALERT_TITLE}</strong>
        <EuiText size="s" color="subdued">
          <p>{ALERT_DESCRIPTION}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'signal',
    inputDisplay: SIGNAL_TITLE,
    dropdownDisplay: (
      <>
        <strong>{SIGNAL_TITLE}</strong>
        <EuiText size="s" color="subdued">
          <p>{SIGNAL_DESCRIPTION}</p>
        </EuiText>
      </>
    ),
  },
];

/**
 * Presentational Mode select. Switches a rule between `alert` (stateful lifecycle)
 * and `signal` (stateless detection) modes. Each option renders its title and a
 * description in the dropdown.
 */
export const ModeSelect = ({
  value,
  onChange,
  disabled = false,
  compressed = false,
  'data-test-subj': dataTestSubj = 'ruleV2ModeSelect',
}: ModeSelectProps) => (
  <EuiFormRow label={LABEL_TEXT} fullWidth>
    <EuiSuperSelect<RuleKind>
      options={MODE_OPTIONS}
      valueOfSelected={value}
      onChange={onChange}
      disabled={disabled}
      compressed={compressed}
      fullWidth
      data-test-subj={dataTestSubj}
    />
  </EuiFormRow>
);
