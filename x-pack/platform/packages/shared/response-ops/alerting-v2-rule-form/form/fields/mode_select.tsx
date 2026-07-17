/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
    'You have a known condition that needs attention. The rule tracks each problem as an episode from first breach to recovery, notifying your team along the way.',
});

const SIGNAL_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.modeField.signal.description',
  {
    defaultMessage:
      "You're exploring — building detection logic, establishing baselines, or collecting evidence before wiring up notifications. Matches are recorded, nothing more.",
  }
);

const ALERT_CARD_ID = 'modeSelectAlert';
const SIGNAL_CARD_ID = 'modeSelectSignal';
const RADIO_GROUP_NAME = 'ruleKindMode';

const cardStyle = css`
  width: 100%;
`;

/**
 * Presentational Mode select. Switches a rule between `alert` (stateful lifecycle)
 * and `signal` (stateless detection) modes using checkable cards.
 */
export const ModeSelect = ({
  value,
  onChange,
  disabled = false,
  'data-test-subj': dataTestSubj = 'ruleV2ModeSelect',
}: ModeSelectProps) => {
  const handleAlertChange = useCallback(() => onChange('alert'), [onChange]);
  const handleSignalChange = useCallback(() => onChange('signal'), [onChange]);

  return (
    <EuiFormRow label={LABEL_TEXT} fullWidth data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          <EuiCheckableCard
            id={ALERT_CARD_ID}
            name={RADIO_GROUP_NAME}
            checked={value === 'alert'}
            disabled={disabled}
            onChange={handleAlertChange}
            css={cardStyle}
            data-test-subj="modeSelectAlertCard"
            label={
              <>
                <strong>{ALERT_TITLE}</strong>
                <EuiText size="xs" color="subdued">
                  <p>{ALERT_DESCRIPTION}</p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="xs" wrap>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">Discover</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">Alerts</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">Actions/workflows</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCheckableCard
            id={SIGNAL_CARD_ID}
            name={RADIO_GROUP_NAME}
            checked={value === 'signal'}
            disabled={disabled}
            onChange={handleSignalChange}
            css={cardStyle}
            data-test-subj="modeSelectSignalCard"
            label={
              <>
                <strong>{SIGNAL_TITLE}</strong>
                <EuiText size="xs" color="subdued">
                  <p>{SIGNAL_DESCRIPTION}</p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiBadge color="hollow">Discover</EuiBadge>
              </>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
