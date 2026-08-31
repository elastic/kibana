/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ServiceChipState } from '../../../onboarding_flow_context';

const STATUS_CONFIG: Record<ServiceChipState, { color: string; label: React.ReactNode }> = {
  instantiating: {
    color: 'subdued',
    label: (
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.serviceStatus.instantiating"
        defaultMessage="Setting up..."
      />
    ),
  },
  detecting: {
    color: 'subdued',
    label: (
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.serviceStatus.detecting"
        defaultMessage="Detecting data..."
      />
    ),
  },
  receiving: {
    color: 'success',
    label: (
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.serviceStatus.receiving"
        defaultMessage="Receiving data"
      />
    ),
  },
  timeout: {
    color: 'warning',
    label: (
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.serviceStatus.timeout"
        defaultMessage="No data detected yet"
      />
    ),
  },
  error: {
    color: 'danger',
    label: (
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.serviceStatus.error"
        defaultMessage="Deployment failed"
      />
    ),
  },
};

interface ServiceStatusIndicatorProps {
  status: ServiceChipState;
}

export function ServiceStatusIndicator({ status }: ServiceStatusIndicatorProps) {
  const { color, label } = STATUS_CONFIG[status];
  // In-progress states are indicated by the tile's leading spinner (see ServiceTile), so the
  // label here stays plain text — a second spinner beside it would read as two activities.
  const isPending = status === 'detecting' || status === 'instantiating';

  return (
    <span aria-live="polite">
      {isPending ? (
        <EuiText size="xs" color={color}>
          {label}
        </EuiText>
      ) : (
        <EuiHealth color={color}>{label}</EuiHealth>
      )}
    </span>
  );
}
