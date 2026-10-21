/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCloudFormationStackArn } from '../../../common/services/cloud_connectors/iac_deployment';

const AWS_IAM_ROLE_ARN_PATTERN = /^arn:aws[a-zA-Z-]*:iam::\d{12}:role\/.+$/;

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
        'State of the callback record. `pending`: waiting for the stack. `receiving`: a report is being applied. `received`: values stored and the identity exists. `cancelled`: the form stopped waiting and the key was invalidated.',
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
  api_key: schema.string({
    meta: {
      description:
        'Base64 id:api_key of the zero-privilege key bound to this record. Returned exactly once; never persisted.',
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
  }),
};

export const ReceiveProvisioningCallbackResponseSchema = schema.object({
  status: ProvisioningCallbackStatusSchema,
});
