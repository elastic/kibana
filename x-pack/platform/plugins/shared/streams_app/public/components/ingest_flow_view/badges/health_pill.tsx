/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FlowHealth } from '@kbn/streams-plugin/common';

type HealthStatus = FlowHealth['status'];

const COLOR_MAP: Record<HealthStatus, 'success' | 'warning' | 'danger' | 'subdued'> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'danger',
  unknown: 'subdued',
};

const LABEL_MAP: Record<HealthStatus, string> = {
  healthy: i18n.translate('xpack.streams.ingestFlow.healthPill.healthy', {
    defaultMessage: 'Healthy',
  }),
  degraded: i18n.translate('xpack.streams.ingestFlow.healthPill.degraded', {
    defaultMessage: 'Degraded',
  }),
  down: i18n.translate('xpack.streams.ingestFlow.healthPill.down', {
    defaultMessage: 'Down',
  }),
  unknown: i18n.translate('xpack.streams.ingestFlow.healthPill.unknown', {
    defaultMessage: 'Unknown',
  }),
};

interface HealthPillProps {
  status: HealthStatus;
  size?: 's' | 'm';
}

export const HealthPill: React.FC<HealthPillProps> = ({ status, size = 's' }) => {
  return (
    <EuiHealth color={COLOR_MAP[status]} textSize={size}>
      {LABEL_MAP[status]}
    </EuiHealth>
  );
};
