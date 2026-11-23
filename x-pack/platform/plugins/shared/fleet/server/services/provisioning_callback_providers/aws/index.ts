/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCloudFormationStackArn } from '../../../../common/services/cloud_connectors/iac_deployment';
import type {
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof,
} from '../../../../common/types/models/provisioning_callback';
import type { ProvisioningCallbackSOAttributes } from '../../../types/so_attributes';
import {
  AWS_REGION_PATTERN,
  STS_GET_CALLER_IDENTITY_BODY,
  verifyCallerIdentity,
} from './caller_identity';

import type { ProvisioningCallbackProvider } from '../types';

const CONNECTOR_NAME_MAX_LENGTH = 255;

const AWS_IAM_ROLE_ARN_PATTERN = /^arn:aws[a-zA-Z-]*:iam::\d{12}:role\/.+$/;

/** Enough for SigV4 with a session token and the two binding headers; anything more is noise. */
const MAX_PROOF_HEADERS = 16;
const MAX_PROOF_HEADER_NAME_LENGTH = 64;
const MAX_PROOF_HEADER_VALUE_LENGTH = 8192;

/**
 * A signed STS `GetCallerIdentity` request the service forwards to prove the AWS account the
 * report came from. Only the region, the headers and the fixed body are accepted: Kibana builds
 * the STS URL itself, so the caller cannot direct it to another host.
 */
const CallerIdentityProofSchema = schema.object({
  region: schema.string({
    minLength: 1,
    maxLength: 32,
    validate: (value) => (AWS_REGION_PATTERN.test(value) ? undefined : 'must be an AWS region'),
    meta: { description: 'Region of the STS endpoint the request was signed for.' },
  }),
  headers: schema.recordOf(
    schema.string({ minLength: 1, maxLength: MAX_PROOF_HEADER_NAME_LENGTH }),
    schema.string({ maxLength: MAX_PROOF_HEADER_VALUE_LENGTH }),
    {
      validate: (value) =>
        Object.keys(value).length <= MAX_PROOF_HEADERS
          ? undefined
          : `must have at most ${MAX_PROOF_HEADERS} headers`,
      meta: {
        description:
          'The signed request headers: `Authorization`, `X-Amz-Date`, `X-Amz-Security-Token`, `Content-Type`, and the signed `x-elastic-callback-id` and `x-elastic-report-sha256` headers that bind the proof to this record and this report.',
      },
    }
  ),
  body: schema.oneOf([schema.literal(STS_GET_CALLER_IDENTITY_BODY)], {
    meta: { description: 'The signed request body.' },
  }),
});

/** What the stack's Lambda reports: the role and the stack it created, and the proof of its account. */
const AwsReportSchema = schema.object({
  role_arn: schema.string({
    minLength: 1,
    maxLength: 2048,
    validate: (value) =>
      AWS_IAM_ROLE_ARN_PATTERN.test(value) ? undefined : 'must be an IAM role ARN',
    meta: { description: 'ARN of the IAM role the stack created.' },
  }),
  stack_arn: schema.string({
    minLength: 1,
    maxLength: 2048,
    validate: (value) =>
      isCloudFormationStackArn(value) ? undefined : 'must be a CloudFormation stack ARN',
    meta: { description: 'ARN (StackId) of the CloudFormation stack.' },
  }),
  origin_proof: CallerIdentityProofSchema,
});

const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];

/** Last path segment of an IAM role ARN, used when the browser has not named the identity yet. */
const roleNameFromArn = (roleArn: string): string => {
  const resource = roleArn.split(':role/')[1] ?? '';
  const name = resource.split('/').pop()?.trim() ?? '';
  return name.slice(0, CONNECTOR_NAME_MAX_LENGTH) || 'aws-workload-identity';
};

/**
 * AWS: the CloudFormation stack's Lambda reports the IAM role and the stack it created, and
 * proves its account with a signed STS `GetCallerIdentity` request that Kibana replays.
 */
export const awsProvisioningCallbackProvider: ProvisioningCallbackProvider<
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof
> = {
  provider: 'aws',

  reportSchema: AwsReportSchema,

  validateReport: (report) =>
    accountIdOfArn(report.role_arn) !== accountIdOfArn(report.stack_arn)
      ? 'role_arn and stack_arn must be in the same AWS account'
      : undefined,

  verifyOrigin: async (proof, expectation, { verifierUrl }) => {
    const verification = await verifyCallerIdentity(proof, expectation, { stsUrl: verifierUrl });
    return verification.verified
      ? { verified: true, account: verification.account, principal: verification.arn }
      : verification;
  },

  storedFields: (report) => ({ role_arn: report.role_arn, stack_arn: report.stack_arn }),

  storedReport: (attributes: ProvisioningCallbackSOAttributes) =>
    attributes.role_arn && attributes.stack_arn
      ? { role_arn: attributes.role_arn, stack_arn: attributes.stack_arn }
      : undefined,

  toConnector: (report, identity) => ({
    name:
      identity.connector_name?.trim().slice(0, CONNECTOR_NAME_MAX_LENGTH) ||
      roleNameFromArn(report.role_arn),
    cloudProvider: 'aws',
    ...(identity.account_type ? { accountType: identity.account_type } : {}),
    vars: { role_arn: { type: 'text', value: report.role_arn } },
    iac_deployment_id: report.stack_arn,
    ...(identity.iac_key !== undefined ? { iac_key: identity.iac_key } : {}),
    ...(identity.iac_blueprint_id !== undefined
      ? { iac_blueprint_id: identity.iac_blueprint_id }
      : {}),
    ...(identity.iac_blueprint_version !== undefined
      ? { iac_blueprint_version: identity.iac_blueprint_version }
      : {}),
  }),
};
