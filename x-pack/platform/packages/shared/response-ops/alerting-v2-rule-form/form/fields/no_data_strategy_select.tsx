/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NoDataStrategy } from '@kbn/alerting-v2-schemas';

interface NoDataStrategySelectProps {
  value: NoDataStrategy;
  onChange: (strategy: NoDataStrategy) => void;
  disabled?: boolean;
  compressed?: boolean;
  'data-test-subj'?: string;
}

const LABEL_TEXT = i18n.translate('xpack.alertingV2.ruleForm.noDataStrategyField.label', {
  defaultMessage: 'No data behavior',
});

const LAST_KNOWN_STATUS_TITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.lastKnownStatus.title',
  { defaultMessage: 'Keep last known status' }
);

const LAST_KNOWN_STATUS_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.lastKnownStatus.description',
  {
    defaultMessage:
      'Maintain the current alert status when no new data is received during a check.',
  }
);

const RECOVER_TITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.recover.title',
  { defaultMessage: 'Recover' }
);

const RECOVER_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.recover.description',
  {
    defaultMessage:
      'Automatically transition active alerts to recovered status when no new data is received.',
  }
);

const NONE_TITLE = i18n.translate('xpack.alertingV2.ruleForm.noDataStrategyField.none.title', {
  defaultMessage: 'Do nothing',
});

const NONE_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.none.description',
  {
    defaultMessage: 'Take no action when no data is received. No-data detection is disabled.',
  }
);

const NO_DATA_STRATEGY_OPTIONS: Array<{
  value: NoDataStrategy;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
}> = [
  {
    value: 'last_known_status',
    inputDisplay: LAST_KNOWN_STATUS_TITLE,
    dropdownDisplay: (
      <>
        <strong>{LAST_KNOWN_STATUS_TITLE}</strong>
        <EuiText size="s" color="subdued">
          <p>{LAST_KNOWN_STATUS_DESCRIPTION}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'recover',
    inputDisplay: RECOVER_TITLE,
    dropdownDisplay: (
      <>
        <strong>{RECOVER_TITLE}</strong>
        <EuiText size="s" color="subdued">
          <p>{RECOVER_DESCRIPTION}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'none',
    inputDisplay: NONE_TITLE,
    dropdownDisplay: (
      <>
        <strong>{NONE_TITLE}</strong>
        <EuiText size="s" color="subdued">
          <p>{NONE_DESCRIPTION}</p>
        </EuiText>
      </>
    ),
  },
];

export const NoDataStrategySelect = ({
  value,
  onChange,
  disabled = false,
  compressed = false,
  'data-test-subj': dataTestSubj = 'ruleV2NoDataStrategySelect',
}: NoDataStrategySelectProps) => (
  <EuiFormRow label={LABEL_TEXT} fullWidth>
    <EuiSuperSelect<NoDataStrategy>
      options={NO_DATA_STRATEGY_OPTIONS}
      valueOfSelected={value}
      onChange={onChange}
      disabled={disabled}
      compressed={compressed}
      fullWidth
      data-test-subj={dataTestSubj}
    />
  </EuiFormRow>
);
