/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCloudFormationStackArn } from '../../../../common/services/cloud_connectors/iac_deployment';

/** The only body Kibana sends to STS; the proof must have been signed over it. */
export const STS_GET_CALLER_IDENTITY_BODY = 'Action=GetCallerIdentity&Version=2011-06-15';
/**
 * A commercial or GovCloud region, which is all `sts.<region>.amazonaws.com` serves: the China
 * partition's STS is at `amazonaws.com.cn`, which neither the Lambda nor Kibana targets, so its
 * regions are refused. Strict on purpose: the region becomes part of the host Kibana connects to.
 */
export const AWS_REGION_PATTERN = /^(?!cn-)[a-z]{2}(-gov)?-[a-z]+-\d$/;

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
const CallerIdentityProofSchema = schema.object(
  {
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
    // One literal, as a oneOf only because `schema.literal` takes no description and the API
    // reference wants one.
    body: schema.oneOf([schema.literal(STS_GET_CALLER_IDENTITY_BODY)], {
      meta: { description: 'The signed request body.' },
    }),
  },
  {
    meta: {
      description:
        'The proof that the report was sent from the account of the reported role and stack: a signed STS `GetCallerIdentity` request, made by the callback function with the callback id and the SHA-256 of the reported values among its signed headers. Kibana forwards it to the regional STS endpoint; whoever answers identifies the signer. Optional while stacks launched before the proof was sent can still report.',
    },
  }
);

/**
 * What the stack's Lambda reports: the role and the stack it created, and the proof of its
 * account. The proof is optional while stacks launched from templates that predate it can still
 * report; it becomes required once none do.
 */
export const AwsReportSchema = schema.object({
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
  origin_proof: schema.maybe(CallerIdentityProofSchema),
});
