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
import { noDataStrategy } from '@kbn/alerting-v2-schemas';

export const DEFAULT_NO_DATA_STRATEGY: NoDataStrategy = noDataStrategy.ignore;

interface NoDataStrategySelectProps {
  value: NoDataStrategy;
  onChange: (strategy: NoDataStrategy) => void;
  disabled?: boolean;
  compressed?: boolean;
  error?: string;
  'data-test-subj'?: string;
}

const LABEL_TEXT = i18n.translate('xpack.alertingV2.ruleForm.noDataStrategyField.label', {
  defaultMessage: 'No data behavior',
});

const KEEP_LAST_TITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.lastKnownStatus.title',
  { defaultMessage: 'Keep last known status' }
);

const KEEP_LAST_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.lastKnownStatus.description',
  {
    defaultMessage:
      'Maintain the current alert status when no new data is received during a check.',
  }
);

const RESOLVE_TITLE = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.recover.title',
  { defaultMessage: 'Recover immediately' }
);

const RESOLVE_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.recover.description',
  {
    defaultMessage: 'Resolve the alert episode on the first no-data run.',
  }
);

const IGNORE_TITLE = i18n.translate('xpack.alertingV2.ruleForm.noDataStrategyField.none.title', {
  defaultMessage: 'Do nothing',
});

const IGNORE_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.ruleForm.noDataStrategyField.none.description',
  {
    defaultMessage: 'Take no action when no data is received. No-data detection is disabled.',
  }
);

const buildOption = (value: NoDataStrategy, title: string, description: string) => ({
  value,
  inputDisplay: title,
  dropdownDisplay: (
    <>
      <strong>{title}</strong>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
    </>
  ),
});

// `alert` is missing on purpose: the write API rejects it, so offering it here
// would only produce a rule the user cannot save.
const NO_DATA_STRATEGY_OPTIONS = [
  buildOption(noDataStrategy.keep_last, KEEP_LAST_TITLE, KEEP_LAST_DESCRIPTION),
  buildOption(noDataStrategy.resolve, RESOLVE_TITLE, RESOLVE_DESCRIPTION),
  buildOption(noDataStrategy.ignore, IGNORE_TITLE, IGNORE_DESCRIPTION),
];

export const NoDataStrategySelect = ({
  value,
  onChange,
  disabled = false,
  compressed = false,
  error,
  'data-test-subj': dataTestSubj = 'ruleV2NoDataStrategySelect',
}: NoDataStrategySelectProps) => (
  <EuiFormRow label={LABEL_TEXT} fullWidth isInvalid={error != null} error={error}>
    <EuiSuperSelect<NoDataStrategy>
      options={NO_DATA_STRATEGY_OPTIONS}
      valueOfSelected={value}
      onChange={onChange}
      disabled={disabled}
      compressed={compressed}
      isInvalid={error != null}
      fullWidth
      data-test-subj={dataTestSubj}
    />
  </EuiFormRow>
);
