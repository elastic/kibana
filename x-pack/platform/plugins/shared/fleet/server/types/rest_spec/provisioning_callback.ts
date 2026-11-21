/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCloudFormationStackArn } from '../../../common/services/cloud_connectors/iac_deployment';
import {
  AWS_REGION_PATTERN,
  STS_GET_CALLER_IDENTITY_BODY,
} from '../../services/provisioning_callback_caller_identity';

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

const CallbackIdParamsSchema = schema.object({
  callbackId: schema.string({
    minLength: 1,
    maxLength: 128,
    meta: { description: 'ID of the callback record, as issued to the stack.' },
  }),
});

const ProvisioningCallbackStatusSchema = schema.oneOf(
  [
    schema.literal('pending'),
    schema.literal('receiving'),
    schema.literal('received'),
    schema.literal('cancelled'),
  ],
  {
    meta: {
      description:
        'State of the callback record. `pending`: waiting for the stack. `receiving`: a report is being applied. `received`: values stored and the identity exists. `cancelled`: the form stopped waiting and the token is refused.',
    },
  }
);

export const CloudConnectorCallbackItemSchema = schema.object({
  id: schema.string(),
  provider: schema.literal('aws'),
  status: ProvisioningCallbackStatusSchema,
  created_at: schema.string(),
  created_by: schema.maybe(schema.string()),
  space_id: schema.maybe(schema.string()),
  expires_at: schema.string(),
  received_at: schema.maybe(schema.string()),
  role_arn: schema.maybe(schema.string()),
  stack_arn: schema.maybe(schema.string()),
  connector_name: schema.maybe(schema.string()),
  account_type: schema.maybe(
    schema.oneOf([schema.literal('single-account'), schema.literal('organization-account')])
  ),
  iac_key: schema.maybe(schema.nullable(schema.string())),
  iac_blueprint_id: schema.maybe(schema.nullable(schema.string())),
  iac_blueprint_version: schema.maybe(schema.nullable(schema.string())),
  cloud_connector_id: schema.maybe(schema.string()),
});

export const GetProvisioningCallbackAvailabilityResponseSchema = schema.object({
  available: schema.boolean(),
  kibana_url: schema.maybe(schema.string()),
  reason: schema.maybe(schema.string()),
});

export const CreateProvisioningCallbackRequestSchema = {
  body: schema.object({
    provider: schema.literal('aws'),
    connector_name: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 255,
        meta: { description: 'Name of the cloud connector the report creates.' },
      })
    ),
    account_type: schema.maybe(
      schema.oneOf([schema.literal('single-account'), schema.literal('organization-account')])
    ),
    // Same limits as the cloud connector fields these are copied to.
    iac_key: schema.maybe(
      schema.nullable(
        schema.string({
          minLength: 1,
          maxLength: 512,
          meta: { description: 'Digest of the rendered template, stored on the cloud connector.' },
        })
      )
    ),
    iac_blueprint_id: schema.maybe(
      schema.nullable(schema.string({ minLength: 1, maxLength: 255 }))
    ),
    iac_blueprint_version: schema.maybe(
      schema.nullable(schema.string({ minLength: 1, maxLength: 64 }))
    ),
  }),
};

export const CreateProvisioningCallbackResponseSchema = schema.object({
  item: CloudConnectorCallbackItemSchema,
  token: schema.string({
    meta: {
      description:
        'The token the stack presents to report to this record, in the `x-elastic-callback-token` header. Not an Elasticsearch credential. Returned exactly once; only its hash is kept.',
    },
  }),
});

export const GetProvisioningCallbackRequestSchema = {
  params: CallbackIdParamsSchema,
};

export const GetProvisioningCallbackResponseSchema = schema.object({
  item: CloudConnectorCallbackItemSchema,
});

export const DeleteProvisioningCallbackRequestSchema = {
  params: CallbackIdParamsSchema,
};

export const DeleteProvisioningCallbackResponseSchema = schema.object({
  item: CloudConnectorCallbackItemSchema,
});

export const ReceiveProvisioningCallbackRequestSchema = {
  params: CallbackIdParamsSchema,
  body: schema.object({
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
    caller_identity: CallerIdentityProofSchema,
  }),
};

export const ReceiveProvisioningCallbackResponseSchema = schema.object({
  status: ProvisioningCallbackStatusSchema,
});
