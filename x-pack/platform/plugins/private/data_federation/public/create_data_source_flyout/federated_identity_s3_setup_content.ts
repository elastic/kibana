/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { FederatedIdentityManualSetupStep } from './federated_identity_manual_setup';
import { federatedIdentityManualSetupStrings } from './federated_identity_manual_setup_code_block';

export const s3FederatedIdentitySetupStrings = {
  manualIntro: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.manual.intro', {
    defaultMessage:
      'Run the commands below in order in AWS CloudShell, or any shell with the AWS CLI configured and permissions to create IAM resources.',
  }),

  roleArnLabel: i18n.translate('xpack.dataFederation.createFlyout.s3.fields.roleArn', {
    defaultMessage: 'Role ARN',
  }),

  roleArnHelp: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.roleArnHelp.manual', {
    defaultMessage: 'Paste the ARN returned by step 3 above.',
  }),
};

/** Quotes a value so the shell exports it verbatim instead of expanding it. */
const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const createIdpCommand = ({
  jwtIssuer,
  subject,
}: {
  jwtIssuer: string;
  subject: string;
}): string => `export JWT_ISSUER=${shellQuote(jwtIssuer)}
export SUBJECT=${shellQuote(subject)}

PROVIDER_ARN=$(aws iam create-open-id-connect-provider \\
  --url "\${JWT_ISSUER}" \\
  --client-id-list "sts.amazonaws.com" \\
  --query 'OpenIDConnectProviderArn' --output text)

ISSUER_HOST="\${JWT_ISSUER#https://}"`;

const CREATE_READ_POLICY_COMMAND = `export BUCKET_NAME="<your-bucket-name>"
export POLICY_NAME="<your-policy-name>"

POLICY_ARN=$(aws iam create-policy \\
  --policy-name "\${POLICY_NAME}" \\
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
  --query 'Policy.Arn' --output text)`;

const CREATE_ROLE_COMMAND = `export ROLE_NAME="<your-role-name>"

ROLE_ARN=$(aws iam create-role \\
  --role-name "\${ROLE_NAME}" \\
  --assume-role-policy-document "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "\${PROVIDER_ARN}" },
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

echo "\${ROLE_ARN}"`;

export const getS3FederatedIdentityManualSteps = ({
  jwtIssuer,
  subject,
}: {
  jwtIssuer: string;
  subject: string;
}): FederatedIdentityManualSetupStep[] => [
  {
    id: 'create-idp',
    title: i18n.translate('xpack.dataFederation.createFlyout.s3.federated.manual.step1.title', {
      defaultMessage: 'Create the OpenID Connect identity provider',
    }),
    description: i18n.translate(
      'xpack.dataFederation.createFlyout.s3.federated.manual.step1.description',
      {
        defaultMessage:
          'Run the export lines even if you already have an AWS identity provider configured for Elastic. In that case, skip only the create command and set PROVIDER_ARN to that provider ARN instead.',
      }
    ),
    command: createIdpCommand({ jwtIssuer, subject }),
    lineNumbers: {
      highlight: '1, 2',
      annotations: {
        1: federatedIdentityManualSetupStrings.jwtIssuerAnnotation,
        2: federatedIdentityManualSetupStrings.subjectAnnotation,
      },
    },
  },
  {
    id: 'create-policy',
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
    command: CREATE_READ_POLICY_COMMAND,
    lineNumbers: {
      highlight: '1, 2',
      annotations: {
        1: federatedIdentityManualSetupStrings.bucketAnnotation,
        2: federatedIdentityManualSetupStrings.defaultAnnotation,
      },
    },
  },
  {
    id: 'create-role',
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
    command: CREATE_ROLE_COMMAND,
    lineNumbers: {
      highlight: '1',
      annotations: { 1: federatedIdentityManualSetupStrings.roleNameAnnotation },
    },
  },
];
