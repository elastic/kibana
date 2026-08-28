/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ServiceChipState } from '../../../onboarding_flow_context';

const STATUS_CONFIG: Record<ServiceChipState, { color: string; label: React.ReactNode }> = {
  instantiating: {
    color: 'subdued',
    label: (
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.serviceStatus.instantiating"
        defaultMessage="Setting up"
      />
    ),
  },
  detecting: {
    color: 'subdued',
    label: (
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.serviceStatus.detecting"
        defaultMessage="Detecting data"
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
  const isAnimated = status === 'detecting' || status === 'instantiating';

  return (
    <span aria-live="polite">
      {isAnimated ? (
        <EuiFlexGroup gutterSize="s" direction="row" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" aria-hidden />{' '}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color={color}>
              {label}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiHealth color={color}>{label}</EuiHealth>
      )}
    </span>
  );
}
