/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SignalType } from '../../aws_service_matrix';

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  logs: i18n.translate('xpack.ingestHub.servicesStep.signalType.logs', {
    defaultMessage: 'Logs',
  }),
  metrics: i18n.translate('xpack.ingestHub.servicesStep.signalType.metrics', {
    defaultMessage: 'Metrics',
  }),
};

interface SignalTypeBadgeProps {
  signalType: SignalType;
}

export const SignalTypeBadge: React.FC<SignalTypeBadgeProps> = ({ signalType }) => {
  const { euiTheme } = useEuiTheme();
  const color = signalType === 'logs' ? euiTheme.colors.textPrimary : euiTheme.colors.textSuccess;
  return (
    <EuiBadge
      color="hollow"
      css={css`
        color: ${color} !important;
        border-color: ${color};
      `}
    >
      {SIGNAL_TYPE_LABELS[signalType]}
    </EuiBadge>
  );
};
