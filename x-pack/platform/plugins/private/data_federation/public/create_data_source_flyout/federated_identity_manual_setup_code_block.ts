/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { FederatedIdentitySetupValues } from './federated_identity_setup_values';

export interface FederatedIdentityManualSetupCodeBlockLineNumbers {
  highlight: string;
  annotations: Record<number, string>;
}

export interface FederatedIdentityManualSetupEditableLine {
  line: number;
  annotation?: string;
}

export const isFederatedIdentityPlaceholderValue = (value: string): boolean =>
  value.includes('<your-') ||
  value.includes('<subscription-id>') ||
  value.includes('<resource-group>');

export const federatedIdentityManualSetupDefaultAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.defaultAnnotation', {
    defaultMessage: 'Replace this placeholder with your own value before running the command.',
  });

export const federatedIdentityManualSetupJwtIssuerAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.jwtIssuerAnnotation', {
    defaultMessage: 'Replace with your Elastic JWT issuer URL.',
  });

export const federatedIdentityManualSetupSubjectAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.subjectAnnotation', {
    defaultMessage: 'Replace with your project or deployment ID.',
  });

export const federatedIdentityManualSetupBucketAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.bucketAnnotation', {
    defaultMessage: 'Replace with your bucket name.',
  });

export const federatedIdentityManualSetupProjectIdAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.projectIdAnnotation', {
    defaultMessage: 'Replace with your cloud project ID.',
  });

export const federatedIdentityManualSetupServiceAccountAnnotation = () =>
  i18n.translate(
    'xpack.dataFederation.createFlyout.federated.manual.codeBlock.serviceAccountAnnotation',
    {
      defaultMessage: 'Replace with your service account email address.',
    }
  );

export const federatedIdentityManualSetupStorageAccountAnnotation = () =>
  i18n.translate(
    'xpack.dataFederation.createFlyout.federated.manual.codeBlock.storageAccountAnnotation',
    {
      defaultMessage: 'Replace with your storage account name.',
    }
  );

export const federatedIdentityManualSetupAzureScopeAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.azureScopeAnnotation', {
    defaultMessage: 'Replace the subscription ID and resource group with your Azure values.',
  });

export const buildFederatedIdentityManualSetupLineNumbers = (
  editableLines: FederatedIdentityManualSetupEditableLine[]
): FederatedIdentityManualSetupCodeBlockLineNumbers | undefined => {
  if (editableLines.length === 0) {
    return undefined;
  }

  const defaultAnnotation = federatedIdentityManualSetupDefaultAnnotation();

  return {
    highlight: editableLines.map(({ line }) => line).join(', '),
    annotations: Object.fromEntries(
      editableLines.map(({ line, annotation }) => [line, annotation ?? defaultAnnotation])
    ),
  };
};

export const buildClusterValueEditableLines = (
  jwtIssuerLine: number,
  subjectLine: number,
  values: FederatedIdentitySetupValues
): FederatedIdentityManualSetupEditableLine[] => {
  const editableLines: FederatedIdentityManualSetupEditableLine[] = [];

  if (isFederatedIdentityPlaceholderValue(values.jwtIssuer)) {
    editableLines.push({
      line: jwtIssuerLine,
      annotation: federatedIdentityManualSetupJwtIssuerAnnotation(),
    });
  }

  if (isFederatedIdentityPlaceholderValue(values.subject)) {
    editableLines.push({
      line: subjectLine,
      annotation: federatedIdentityManualSetupSubjectAnnotation(),
    });
  }

  return editableLines;
};
