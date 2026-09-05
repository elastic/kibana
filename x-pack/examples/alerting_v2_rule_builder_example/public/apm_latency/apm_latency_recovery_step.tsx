/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { EuiFieldNumber, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBuilderState, type FormValues } from '@kbn/alerting-v2-rule-form';
import { LATENCY_COLUMN } from '../../common/apm_latency/constants';
import type { ApmLatencyBuilderFields } from '../../common/apm_latency';

const RECOVERY_TITLE = i18n.translate(
  'xpack.alertingV2RuleBuilderExample.apmLatency.recovery.title',
  { defaultMessage: 'Recovery condition' }
);

const RECOVERY_THRESHOLD_LABEL = i18n.translate(
  'xpack.alertingV2RuleBuilderExample.apmLatency.recovery.thresholdLabel',
  { defaultMessage: 'Recovery threshold (ms)' }
);

const RECOVERY_THRESHOLD_HELP = i18n.translate(
  'xpack.alertingV2RuleBuilderExample.apmLatency.recovery.thresholdHelp',
  {
    defaultMessage:
      'Latency must fall to or below this value (in ms) to recover. Leave empty to use the breach threshold.',
  }
);

export const ApmLatencyRecoveryStep: React.FC = () => {
  const { state: fields, setState: setFields } = useBuilderState<ApmLatencyBuilderFields>();
  const { setValue } = useFormContext<FormValues>();
  const query = useWatch<FormValues, 'query'>({ name: 'query' });

  const effectiveThreshold = fields.recoveryThresholdMs ?? fields.thresholdMs;

  useEffect(() => {
    if (query?.format !== 'composed') return;
    const segment = `| WHERE ${LATENCY_COLUMN} <= ${effectiveThreshold}.0`;
    if (query.recovery?.segment !== segment) {
      setValue('query', { ...query, recovery: { segment } });
    }
  }, [effectiveThreshold, query, setValue]);

  return (
    <>
      <EuiText size="s">
        <strong>{RECOVERY_TITLE}</strong>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label={RECOVERY_THRESHOLD_LABEL} helpText={RECOVERY_THRESHOLD_HELP} fullWidth>
        <EuiFieldNumber
          fullWidth
          min={1}
          placeholder={String(fields.thresholdMs)}
          value={fields.recoveryThresholdMs ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            setFields({
              ...fields,
              recoveryThresholdMs: raw === '' ? undefined : Number(raw),
            });
          }}
          data-test-subj="apmLatencyRecoveryThreshold"
        />
      </EuiFormRow>
    </>
  );
};
