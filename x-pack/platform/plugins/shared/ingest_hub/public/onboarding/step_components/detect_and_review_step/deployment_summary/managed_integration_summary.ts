/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';

export interface SummaryField {
  labelId: string;
  defaultMessage: string;
  value: ReactNode | null;
}

export function getManagedIntegrationSummaryFields({
  globalRegion,
  cfnStackName,
  connectorName,
}: {
  globalRegion: string | undefined;
  cfnStackName: string | undefined;
  connectorName: string | undefined;
}): SummaryField[] {
  return [
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.deploymentMethod',
      defaultMessage: 'Deployment method',
      value: i18n.translate(
        'xpack.ingestHub.detectAndReviewStep.deploymentSummary.value.managedIntegration',
        { defaultMessage: 'Elastic Managed Integration' }
      ),
    },
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.region',
      defaultMessage: 'Region',
      value: globalRegion || null,
    },
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.cloudFormationStack',
      defaultMessage: 'CloudFormation stack',
      value: cfnStackName || null,
    },
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.federatedIdentityName',
      defaultMessage: 'Federated Identity Name',
      value: connectorName || null,
    },
  ];
}
