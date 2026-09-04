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
  federatedIdentityManualSetupRoleNameAnnotation,
} from './federated_identity_manual_setup_code_block';
import type { FederatedIdentitySetupValues } from './federated_identity_setup_values';

const AWS_CLOUDFORMATION_LAUNCH_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/create/review';

export const getS3FederatedIdentityDescription = () =>
  i18n.translate('xpack.dataFederation.createFlyout.s3.federated.description', {
    defaultMessage:
      'No credentials are stored. AWS trusts the identity Elastic issues for your project or deployment.',
  });

export const getS3FederatedIdentityManualIntro = () =>
  i18n.translate('xpack.dataFederation.createFlyout.s3.federated.manual.intro', {
    defaultMessage:
      'Run the commands below in order in AWS CloudShell, or any shell with the AWS CLI configured and permissions to create IAM resources.',
  });

export const getS3FederatedIdentityManualSteps = (
  values: FederatedIdentitySetupValues
): FederatedIdentityManualSetupStep[] => [
  {
    id: 'create-idp',
    stepNumber: 1,
    title: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.manual.step1.title', {
      defaultMessage: 'Create the OpenID Connect identity provider',
    }),
    description: i18n.translate(
      'xpack.dataFederation.createFlyout.s3.federated.manual.step1.description',
      {
        defaultMessage:
          'Skip this step if you already have an AWS identity provider configured for Elastic. Set IDP_ARN to that provider ARN and ISSUER_HOST to the issuer host without the https:// prefix.',
      }
    ),
    command: `export JWT_ISSUER="${values.jwtIssuer}"
export SUBJECT="${values.subject}"

IDP_ARN=$(aws iam create-open-id-connect-provider \\
  --url "\${JWT_ISSUER}" \\
  --client-id-list "sts.amazonaws.com" \\
  --query 'OpenIDConnectProviderArn' --output text)

ISSUER_HOST="\${JWT_ISSUER#https://}"`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers(
      buildClusterValuePrefilledLines(1, 2)
    ),
  },
  {
    id: 'create-policy',
    stepNumber: 2,
    title: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.manual.step2.title', {
      defaultMessage: 'Create the read policy',
    }),
    description: i18n.translate(
      'xpack.dataFederation.createFlyout.s3.federated.manual.step2.description',
      {
        defaultMessage:
          'ListBucket and GetBucketLocation are needed so prefix and glob queries resolve, not just object reads. The policy covers the whole bucket, so narrow the object resource to a prefix for a tighter scope.',
      }
    ),
    command: `export BUCKET_NAME="<your-bucket-name>"

POLICY_ARN=$(aws iam create-policy \\
  --policy-name "elastic-data-federation-s3-read" \\
  --policy-document "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [ "s3:GetObject" ],
      "Resource": [ "arn:aws:s3:::\${BUCKET_NAME}/*" ]
    },
    {
      "Effect": "Allow",
      "Action": [ "s3:ListBucket", "s3:GetBucketLocation" ],
      "Resource": [ "arn:aws:s3:::\${BUCKET_NAME}" ]
    }
  ]
}
EOF
)" \\
  --query 'Policy.Arn' --output text)`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers([
      { line: 1, annotation: federatedIdentityManualSetupBucketAnnotation() },
    ]),
  },
  {
    id: 'create-role',
    stepNumber: 3,
    title: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.manual.step3.title', {
      defaultMessage: 'Create the IAM role and attach the policy',
    }),
    description: i18n.translate(
      'xpack.dataFederation.createFlyout.s3.federated.manual.step3.description',
      {
        defaultMessage:
          'Only your identity provider can assume the role, and only for your token audience and subject. The command prints the role ARN you need below.',
      }
    ),
    command: `export ROLE_NAME="<your-role-name>"

ROLE_ARN=$(aws iam create-role \\
  --role-name "\${ROLE_NAME}" \\
  --assume-role-policy-document "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "\${IDP_ARN}" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "\${ISSUER_HOST}:aud": "sts.amazonaws.com",
          "\${ISSUER_HOST}:sub": "\${SUBJECT}"
        }
      }
    }
  ]
}
EOF
)" \\
  --query 'Role.Arn' --output text)

aws iam attach-role-policy \\
  --role-name "\${ROLE_NAME}" \\
  --policy-arn "\${POLICY_ARN}"

echo "\${ROLE_ARN}"`,
    lineNumbers: buildFederatedIdentityManualSetupLineNumbers([
      { line: 1, annotation: federatedIdentityManualSetupRoleNameAnnotation() },
    ]),
  },
];

export const getS3FederatedIdentityDeployConfig = () => ({
  cloudProviderIcon: 'logoAWS' as const,
  title: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.deploy.title', {
    defaultMessage: 'Deploy with AWS CloudFormation',
  }),
  description: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.deploy.description', {
    defaultMessage: 'Runs a stack in the AWS console and returns a role ARN to paste below.',
  }),
  launchUrl: AWS_CLOUDFORMATION_LAUNCH_URL,
  launchButtonLabel: i18n.translate(
    'xpack.dataFederation.createFlyout.s3.federated.deploy.launchButton',
    {
      defaultMessage: 'Launch CloudFormation template',
    }
  ),
  createsTitle: i18n.translate(
    'xpack.dataFederation.createFlyout.s3.federated.deploy.createsTitle',
    {
      defaultMessage: 'What the template creates',
    }
  ),
  createsItems: [
    i18n.translate('xpack.dataFederation.createFlyout.s3.federated.deploy.creates.idp', {
      defaultMessage:
        'IAM OIDC identity provider that trusts the JWT issuer for your Elastic project or deployment.',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.s3.federated.deploy.creates.role', {
      defaultMessage:
        'IAM role with a trust policy scoped to your project or deployment ID (sub condition).',
    }),
    i18n.translate('xpack.dataFederation.createFlyout.s3.federated.deploy.creates.policy', {
      defaultMessage:
        'S3 read policy granting s3:GetObject, s3:ListBucket, and s3:GetBucketLocation.',
    }),
  ],
});

export const getS3FederatedIdentityRoleArnHelp = (fromDeploy: boolean) =>
  fromDeploy
    ? i18n.translate('xpack.dataFederation.createFlyout.s3.federated.roleArnHelp.deploy', {
        defaultMessage: 'CloudFormation → Stacks → your stack → Outputs → RoleArn',
      })
    : i18n.translate('xpack.dataFederation.createFlyout.s3.federated.roleArnHelp.manual', {
        defaultMessage: 'Paste the ARN returned by step 3 above.',
      });

export const getS3FederatedIdentityRoleArnLabel = (fromDeploy: boolean) =>
  fromDeploy
    ? i18n.translate('xpack.dataFederation.createFlyout.s3.federated.roleArnLabel.deploy', {
        defaultMessage: 'Role ARN (from CloudFormation Outputs)',
      })
    : i18n.translate('xpack.dataFederation.createFlyout.s3.fields.roleArn', {
        defaultMessage: 'Role ARN',
      });
