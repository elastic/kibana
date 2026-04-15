/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';
import { EMPTY_VALUE } from './utils';

const RECOVERY_TYPE_LABELS: Record<string, string> = {
  query: i18n.translate('xpack.alertingV2.ruleDetails.recoveryTypeQuery', {
    defaultMessage: 'ESQL recovery query',
  }),
  no_breach: i18n.translate('xpack.alertingV2.ruleDetails.recoveryTypeNoBreach', {
    defaultMessage: 'No breach',
  }),
};

interface RecoveryPolicyProps {
  recoveryPolicy: RuleApiResponse['recovery_policy'];
}

export const RecoveryPolicy = ({ recoveryPolicy }: RecoveryPolicyProps) => {
  if (!recoveryPolicy) return <>{EMPTY_VALUE}</>;

  const typeLabel = RECOVERY_TYPE_LABELS[recoveryPolicy.type] ?? recoveryPolicy.type;
  const hasQuery = recoveryPolicy.type === 'query' && recoveryPolicy.query?.base;

  if (!hasQuery) {
    return <>{typeLabel}</>;
  }

  return (
    <>
      <EuiText size="s">{typeLabel}</EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock
        language="esql"
        isCopyable
        paddingSize="m"
        data-test-subj="alertingV2RuleDetailsRecoveryQueryBase"
      >
        {recoveryPolicy.query?.base}
      </EuiCodeBlock>
    </>
  );
};
