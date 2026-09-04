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
  federatedIdentityManualSetupBucketAnnotation,
  federatedIdentityManualSetupProjectIdAnnotation,
  federatedIdentityManualSetupServiceAccountAnnotation,
} from './federated_identity_manual_setup_code_block';
import type { FederatedIdentitySetupValues } from './federated_identity_setup_values';

const GCP_DEPLOY_LAUNCH_URL = 'https://console.cloud.google.com/iam-admin/workload-identity-pools';

export const getGcsFederatedIdentityDescription = () =>
  i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.description', {
    defaultMessage:
      'No credentials are stored. Google Cloud trusts the identity Elastic issues for your project or deployment.',
  });

export const getGcsFederatedIdentityManualIntro = () =>
  i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.manual.intro', {
    defaultMessage:
      'Run the commands below in order in Google Cloud Shell or any shell with gcloud configured.',
  });

export const getGcsFederatedIdentityManualSteps = (
  values: FederatedIdentitySetupValues
): FederatedIdentityManualSetupStep[] => [
  {
    id: 'create-pool',
    stepNumber: 1,
    title: i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.manual.step1.title', {
      defaultMessage: 'Create the workload identity pool',
    }),
    command: `export PROJECT_ID="<your-gcp-project-id>"
export POOL_ID="elastic-data-federation"
export PROVIDER_ID="elastic-issuer"

gcloud iam workload-identity-pools create "\${POOL_ID}" \\
  --project="\${PROJECT_ID}" \\
  --location="global" \\
  --display-name="Elastic Data Federation"`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers([
      { line: 1, annotation: federatedIdentityManualSetupProjectIdAnnotation() },
    ]),
  },
  {
    id: 'create-provider',
    stepNumber: 2,
    title: i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.manual.step2.title', {
      defaultMessage: 'Create the OIDC provider',
    }),
    command: `export JWT_ISSUER="${values.jwtIssuer}"
export SUBJECT="${values.subject}"

gcloud iam workload-identity-pools providers create-oidc "\${PROVIDER_ID}" \\
  --project="\${PROJECT_ID}" \\
  --location="global" \\
  --workload-identity-pool="\${POOL_ID}" \\
  --display-name="Elastic issuer" \\
  --issuer-uri="\${JWT_ISSUER}" \\
  --attribute-mapping="google.subject=assertion.sub,attribute.elastic_subject=assertion.sub" \\
  --attribute-condition="assertion.sub=='\${SUBJECT}'"`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers(
      buildClusterValuePrefilledLines(1, 2)
    ),
  },
  {
    id: 'bind-service-account',
    stepNumber: 3,
    title: i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.manual.step3.title', {
      defaultMessage: 'Grant the service account access to your bucket',
    }),
    command: `export SERVICE_ACCOUNT="<your-service-account>@\${PROJECT_ID}.iam.gserviceaccount.com"
export BUCKET_NAME="<your-bucket-name>"

gcloud storage buckets add-iam-policy-binding "gs://\${BUCKET_NAME}" \\
  --member="serviceAccount:\${SERVICE_ACCOUNT}" \\
  --role="roles/storage.objectViewer"

gcloud iam service-accounts add-iam-policy-binding "\${SERVICE_ACCOUNT}" \\
  --project="\${PROJECT_ID}" \\
  --role="roles/iam.workloadIdentityUser" \\
  --member="principalSet://iam.googleapis.com/projects/\${PROJECT_ID}/locations/global/workloadIdentityPools/\${POOL_ID}/attribute.elastic_subject/\${SUBJECT}"

echo "//iam.googleapis.com/projects/\${PROJECT_ID}/locations/global/workloadIdentityPools/\${POOL_ID}/providers/\${PROVIDER_ID}"`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers([
      { line: 1, annotation: federatedIdentityManualSetupServiceAccountAnnotation() },
      { line: 2, annotation: federatedIdentityManualSetupBucketAnnotation() },
    ]),
  },
];

export const getGcsFederatedIdentityDeployConfig = () => ({
  cloudProviderIcon: 'logoGoogleG' as const,
  title: i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.deploy.title', {
    defaultMessage: 'Deploy with Google Cloud',
  }),
  description: i18n.translate(
    'xpack.dataFederation.createFlyout.gcs.federated.deploy.description',
    {
      defaultMessage:
        'Sets up workload identity federation in the Google Cloud console and returns the provider name to use below.',
    }
  ),
  launchUrl: GCP_DEPLOY_LAUNCH_URL,
  launchButtonLabel: i18n.translate(
    'xpack.dataFederation.createFlyout.gcs.federated.deploy.launchButton',
    {
      defaultMessage: 'Open workload identity setup',
    }
  ),
  createsTitle: i18n.translate(
    'xpack.dataFederation.createFlyout.gcs.federated.deploy.createsTitle',
    {
      defaultMessage: 'What the deployment creates',
    }
  ),
  createsItems: [
    i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.deploy.creates.pool', {
      defaultMessage: 'Workload identity pool for Elastic-issued tokens.',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.deploy.creates.provider', {
      defaultMessage: 'OIDC provider mapped to your Elastic JWT issuer and subject.',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.deploy.creates.binding', {
      defaultMessage: 'Service account binding with storage.objectViewer on your bucket.',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.deploy.creates.output', {
      defaultMessage: 'Provider resource name. Use this value as the STS audience in Elastic.',
    }),
  ],
});

export const getGcsFederatedIdentityStsAudienceHelp = (fromDeploy: boolean) =>
  fromDeploy
    ? i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.stsAudienceHelp.deploy', {
        defaultMessage:
          'IAM → Workload Identity Federation → Providers → copy the provider resource name.',
      })
    : i18n.translate('xpack.dataFederation.createFlyout.gcs.federated.stsAudienceHelp.manual', {
        defaultMessage: 'Paste the provider resource name printed by step 3 above.',
      });
