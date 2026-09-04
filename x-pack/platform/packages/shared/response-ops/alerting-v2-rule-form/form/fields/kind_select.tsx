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
  EuiIconTip,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleKind } from '@kbn/alerting-v2-schemas';

interface KindSelectProps {
  value: RuleKind;
  onChange: (kind: RuleKind) => void;
  disabled?: boolean;
  readOnly?: boolean;
  'data-test-subj'?: string;
}

const LABEL_TEXT = i18n.translate('xpack.alertingV2.ruleForm.kindField.label', {
  defaultMessage: "What's your goal?",
});

const READ_ONLY_TOOLTIP = i18n.translate('xpack.alertingV2.ruleForm.kindField.readOnlyTooltip', {
  defaultMessage:
    "Changing the outcome isn't available when editing. Duplicate this rule or create a new one.",
});

const ALERT_TITLE = i18n.translate('xpack.alertingV2.ruleForm.kindField.alert.title', {
  defaultMessage: 'Detect and respond',
});

const SIGNAL_TITLE = i18n.translate('xpack.alertingV2.ruleForm.kindField.signal.title', {
  defaultMessage: 'Collect evidence',
});

const ALERT_DESCRIPTION = i18n.translate('xpack.alertingV2.ruleForm.kindField.alert.description', {
  defaultMessage:
    'Tracks each problem as an alert episode and its lifecycle, link it to workflows to notify your team.',
});

const SIGNAL_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.kindField.signal.description',
  {
    defaultMessage:
      'Matches are stored as queryable events. No alerts, no notifications - just data.',
  }
);

const KIND_OPTIONS: Array<{
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

const KindCardLabel = ({ title, description }: { title: string; description: string }) => (
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

export const KindSelect = ({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  'data-test-subj': dataTestSubj = 'ruleV2KindSelect',
}: KindSelectProps) => {
  const radioGroupId = useGeneratedHtmlId({ prefix: 'ruleV2KindSelect' });
  const options = readOnly ? KIND_OPTIONS.filter((option) => option.value === value) : KIND_OPTIONS;

  return (
    <EuiFormRow
      label={
        readOnly ? (
          <>
            {LABEL_TEXT}{' '}
            <EuiIconTip
              type="info"
              color="subdued"
              content={READ_ONLY_TOOLTIP}
              iconProps={{ 'data-test-subj': `${dataTestSubj}-readOnlyTooltip` }}
            />
          </>
        ) : (
          LABEL_TEXT
        )
      }
      labelType="legend"
      aria-label={LABEL_TEXT}
      fullWidth
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {options.map((option) => {
          const optionId = `${radioGroupId}-${option.value}`;
          return (
            <EuiFlexItem key={option.value} grow={false}>
              <EuiCheckableCard
                id={optionId}
                data-test-subj={`${dataTestSubj}-${option.value}`}
                label={<KindCardLabel title={option.title} description={option.description} />}
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
