/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface FederatedIdentityManualSetupCodeBlockLineNumbers {
  highlight: string;
  annotations: Record<number, string>;
}

export interface FederatedIdentityManualSetupEditableLine {
  line: number;
  annotation?: string;
}

export const federatedIdentityManualSetupDefaultAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.defaultAnnotation', {
    defaultMessage: 'Replace this placeholder with your own value before running the command.',
  });

export const federatedIdentityManualSetupJwtIssuerAnnotation = () =>
  i18n.translate(
    'xpack.dataFederation.createFlyout.federated.manual.codeBlock.jwtIssuerPrefilledAnnotation',
    {
      defaultMessage:
        "Your deployment's issuer URL, filled in for you. Leave this value unchanged, otherwise your cloud provider cannot verify the token Elasticsearch presents.",
    }
  );

export const federatedIdentityManualSetupSubjectAnnotation = () =>
  i18n.translate(
    'xpack.dataFederation.createFlyout.federated.manual.codeBlock.subjectPrefilledAnnotation',
    {
      defaultMessage:
        'Your deployment ID, filled in for you. Leave this value unchanged, otherwise the trust policy will not match your deployment.',
    }
  );

export const federatedIdentityManualSetupBucketAnnotation = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.manual.codeBlock.bucketAnnotation', {
    defaultMessage:
      'Replace with the name of the bucket that holds the data you want to query from Elastic. Read access is granted to this bucket only, so repeat these steps for any other bucket you need.',
  });

export const federatedIdentityManualSetupRoleNameAnnotation = () =>
  i18n.translate(
    'xpack.dataFederation.createFlyout.federated.manual.codeBlock.roleNameAnnotation',
    {
      defaultMessage:
        'Replace with a name for the IAM role Elasticsearch assumes, for example elastic-data-federation. A role with this name must not already exist in your AWS account.',
    }
  );

export const federatedIdentityManualSetupProjectIdAnnotation = () =>
  i18n.translate(
    'xpack.dataFederation.createFlyout.federated.manual.codeBlock.projectIdAnnotation',
    {
      defaultMessage: 'Replace with your cloud project ID.',
    }
  );

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
  i18n.translate(
    'xpack.dataFederation.createFlyout.federated.manual.codeBlock.azureScopeAnnotation',
    {
      defaultMessage: 'Replace the subscription ID and resource group with your Azure values.',
    }
  );

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

/**
 * The issuer URL and subject are resolved for the user, so both lines are always annotated to
 * make clear they need no editing.
 */
export const buildClusterValuePrefilledLines = (
  jwtIssuerLine: number,
  subjectLine: number
): FederatedIdentityManualSetupEditableLine[] => [
  { line: jwtIssuerLine, annotation: federatedIdentityManualSetupJwtIssuerAnnotation() },
  { line: subjectLine, annotation: federatedIdentityManualSetupSubjectAnnotation() },
];
