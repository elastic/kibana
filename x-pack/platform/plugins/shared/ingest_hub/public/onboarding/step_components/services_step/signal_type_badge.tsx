/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SignalType } from '../../aws_service_matrix';

const LABELS: Record<SignalType, string> = {
  logs: i18n.translate('xpack.ingestHub.servicesStep.signalType.logs', {
    defaultMessage: 'Logs',
  }),
  metrics: i18n.translate('xpack.ingestHub.servicesStep.signalType.metrics', {
    defaultMessage: 'Metrics',
  }),
};

const COLORS: Record<SignalType, string> = {
  logs: 'primary',
  metrics: 'success',
};

interface SignalTypeBadgeProps {
  signalType: SignalType;
}

export const SignalTypeBadge: React.FC<SignalTypeBadgeProps> = ({ signalType }) => (
  <EuiBadge color={COLORS[signalType]}>{LABELS[signalType]}</EuiBadge>
);
