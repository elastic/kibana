/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { FederatedIdentityManualSetupStep } from './federated_identity_manual_setup';
import {
  buildClusterValuePrefilledLines,
  buildFederatedIdentityManualSetupLineNumbers,
  federatedIdentityManualSetupAzureScopeAnnotation,
  federatedIdentityManualSetupStorageAccountAnnotation,
} from './federated_identity_manual_setup_code_block';
import type { FederatedIdentitySetupValues } from './federated_identity_setup_values';

const AZURE_DEPLOY_LAUNCH_URL =
  'https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Felastic%2Fazure-quickstart-templates%2Fmain%2Felastic-data-federation%2Fazuredeploy.json';

export const getAzureFederatedIdentityDescription = () =>
  i18n.translate('xpack.dataFederation.createFlyout.azure.federated.description', {
    defaultMessage:
      'No credentials are stored. Azure trusts the identity Elastic issues for your project or deployment through federated credentials.',
  });

export const getAzureFederatedIdentityManualIntro = () =>
  i18n.translate('xpack.dataFederation.createFlyout.azure.federated.manual.intro', {
    defaultMessage:
      'Run the commands below in order in Azure Cloud Shell or any shell with the Azure CLI configured.',
  });

export const getAzureFederatedIdentityManualSteps = (
  values: FederatedIdentitySetupValues
): FederatedIdentityManualSetupStep[] => [
  {
    id: 'create-app',
    stepNumber: 1,
    title: i18n.translate('xpack.dataFederation.createFlyout.azure.federated.manual.step1.title', {
      defaultMessage: 'Create the app registration',
    }),
    command: `export APP_NAME="elastic-data-federation"

APP_ID=$(az ad app create \\
  --display-name "\${APP_NAME}" \\
  --query appId --output tsv)

echo "\${APP_ID}"`,
  },
  {
    id: 'create-federated-credential',
    stepNumber: 2,
    title: i18n.translate('xpack.dataFederation.createFlyout.azure.federated.manual.step2.title', {
      defaultMessage: 'Add the federated credential',
    }),
    command: `export JWT_ISSUER="${values.jwtIssuer}"
export SUBJECT="${values.subject}"

az ad app federated-credential create \\
  --id "\${APP_ID}" \\
  --parameters '{
    "name": "elastic-data-federation",
    "issuer": "'"\${JWT_ISSUER}"'",
    "subject": "'"\${SUBJECT}"'",
    "audiences": [ "api://AzureADTokenExchange" ]
  }'`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers(
      buildClusterValuePrefilledLines(1, 2)
    ),
  },
  {
    id: 'assign-role',
    stepNumber: 3,
    title: i18n.translate('xpack.dataFederation.createFlyout.azure.federated.manual.step3.title', {
      defaultMessage: 'Assign storage access to the app',
    }),
    command: `export STORAGE_ACCOUNT="<your-storage-account>"
export TENANT_ID=$(az account show --query tenantId --output tsv)

az role assignment create \\
  --assignee "\${APP_ID}" \\
  --role "Storage Blob Data Reader" \\
  --scope "/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/\${STORAGE_ACCOUNT}"

echo "Tenant ID: \${TENANT_ID}"
echo "Client ID: \${APP_ID}"`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers([
      { line: 1, annotation: federatedIdentityManualSetupStorageAccountAnnotation() },
      { line: 7, annotation: federatedIdentityManualSetupAzureScopeAnnotation() },
    ]),
  },
];

export const getAzureFederatedIdentityDeployConfig = () => ({
  cloudProviderIcon: 'logoAzure' as const,
  title: i18n.translate('xpack.dataFederation.createFlyout.azure.federated.deploy.title', {
    defaultMessage: 'Deploy with Azure Resource Manager',
  }),
  description: i18n.translate(
    'xpack.dataFederation.createFlyout.azure.federated.deploy.description',
    {
      defaultMessage:
        'Runs a custom deployment in the Azure portal and returns the tenant and client IDs to paste below.',
    }
  ),
  launchUrl: AZURE_DEPLOY_LAUNCH_URL,
  launchButtonLabel: i18n.translate(
    'xpack.dataFederation.createFlyout.azure.federated.deploy.launchButton',
    {
      defaultMessage: 'Launch ARM template',
    }
  ),
  createsTitle: i18n.translate(
    'xpack.dataFederation.createFlyout.azure.federated.deploy.createsTitle',
    {
      defaultMessage: 'What the template creates',
    }
  ),
  createsItems: [
    i18n.translate('xpack.dataFederation.createFlyout.azure.federated.deploy.creates.app', {
      defaultMessage: 'App registration trusted by your Elastic JWT issuer.',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.azure.federated.deploy.creates.credential', {
      defaultMessage: 'Federated credential scoped to your project or deployment ID (subject).',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.azure.federated.deploy.creates.role', {
      defaultMessage: 'Storage Blob Data Reader role on your storage account.',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.azure.federated.deploy.creates.output', {
      defaultMessage:
        'Template outputs TenantId and ClientId. Copy these from the deployment outputs.',
    }),
  ],
});

export const getAzureFederatedIdentityFieldHelp = (fromDeploy: boolean) =>
  fromDeploy
    ? i18n.translate('xpack.dataFederation.createFlyout.azure.federated.fieldHelp.deploy', {
        defaultMessage: 'Copy Tenant ID and Client ID from the deployment outputs.',
      })
    : i18n.translate('xpack.dataFederation.createFlyout.azure.federated.fieldHelp.manual', {
        defaultMessage: 'Paste the Tenant ID and Client ID printed by step 3 above.',
      });
