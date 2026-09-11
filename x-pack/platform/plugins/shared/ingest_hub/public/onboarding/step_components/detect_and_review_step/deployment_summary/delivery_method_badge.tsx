/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../../aws_service_matrix';

interface DeliveryMethodBadgeProps {
  entry: AwsServiceMatrixEntry;
  deploymentMethod: DeploymentMethod;
}

export function DeliveryMethodBadge({ entry, deploymentMethod }: DeliveryMethodBadgeProps) {
  if (entry.ecfLogType != null) {
    return (
      <EuiBadge color="hollow">
        <FormattedMessage
          id="xpack.ingestHub.detectAndReviewStep.deliveryBadge.triggerS3"
          defaultMessage="Trigger: S3"
        />
      </EuiBadge>
    );
  }

  if (deploymentMethod === 'agent_based') {
    return (
      <EuiBadge color="hollow">
        <FormattedMessage
          id="xpack.ingestHub.detectAndReviewStep.deliveryBadge.elasticAgent"
          defaultMessage="Elastic Agent"
        />
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.ingestHub.detectAndReviewStep.deliveryBadge.managedIntegration"
        defaultMessage="Managed Integration"
      />
    </EuiBadge>
  );
}
