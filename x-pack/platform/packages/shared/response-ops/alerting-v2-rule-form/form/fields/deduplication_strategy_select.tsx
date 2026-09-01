/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DeduplicationStrategy } from '@kbn/alerting-v2-schemas';

interface DeduplicationStrategySelectProps {
  value: DeduplicationStrategy;
  onChange: (strategy: DeduplicationStrategy) => void;
  disabled?: boolean;
  compressed?: boolean;
  'data-test-subj'?: string;
}

const LABEL_TEXT = i18n.translate('xpack.alertingV2.ruleForm.deduplicationStrategyField.label', {
  defaultMessage: 'Deduplication',
});

const RULE_EVENT_TITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.deduplicationStrategyField.ruleEvent.title',
  { defaultMessage: 'Drop duplicates' }
);

const RULE_EVENT_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.deduplicationStrategyField.ruleEvent.description',
  {
    defaultMessage:
      'Identical result rows are written once per rule per space. Re-matches of the same row are silently dropped.',
  }
);

const EPISODE_TITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.deduplicationStrategyField.episode.title',
  { defaultMessage: 'Full audit trail' }
);

const EPISODE_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.deduplicationStrategyField.episode.description',
  {
    defaultMessage:
      'Every match is written. Manually closed episodes stay closed and do not re-notify on re-match.',
  }
);

const DEDUPLICATION_STRATEGY_OPTIONS: Array<{
  value: DeduplicationStrategy;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
}> = [
  {
    value: 'rule_event',
    inputDisplay: RULE_EVENT_TITLE,
    dropdownDisplay: (
      <>
        <strong>{RULE_EVENT_TITLE}</strong>
        <EuiText size="s" color="subdued">
          <p>{RULE_EVENT_DESCRIPTION}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'episode',
    inputDisplay: EPISODE_TITLE,
    dropdownDisplay: (
      <>
        <strong>{EPISODE_TITLE}</strong>
        <EuiText size="s" color="subdued">
          <p>{EPISODE_DESCRIPTION}</p>
        </EuiText>
      </>
    ),
  },
];

export const DeduplicationStrategySelect = ({
  value,
  onChange,
  disabled = false,
  compressed = false,
  'data-test-subj': dataTestSubj = 'ruleV2DeduplicationStrategySelect',
}: DeduplicationStrategySelectProps) => (
  <EuiFormRow label={LABEL_TEXT} fullWidth>
    <EuiSuperSelect<DeduplicationStrategy>
      options={DEDUPLICATION_STRATEGY_OPTIONS}
      valueOfSelected={value}
      onChange={onChange}
      disabled={disabled}
      compressed={compressed}
      fullWidth
      data-test-subj={dataTestSubj}
    />
  </EuiFormRow>
);
