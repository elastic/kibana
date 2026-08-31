/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
  signalTypes: SignalType[];
}

export const SignalTypeBadge: React.FC<SignalTypeBadgeProps> = ({ signalTypes }) => {
  if (signalTypes.length === 0) return null;
  if (signalTypes.length === 1) {
    return <EuiBadge color="hollow">{SIGNAL_TYPE_LABELS[signalTypes[0]]}</EuiBadge>;
  }
  return (
    <EuiFlexGroup gutterSize="xs" wrap={false} responsive={false}>
      {signalTypes.map((t) => (
        <EuiFlexItem key={t} grow={false}>
          <EuiBadge color="hollow">{SIGNAL_TYPE_LABELS[t]}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
