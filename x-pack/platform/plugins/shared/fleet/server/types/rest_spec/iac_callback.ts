/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCloudFormationStackArn } from '../../../common/services/cloud_connectors/iac_deployment';

const AWS_IAM_ROLE_ARN_PATTERN = /^arn:aws[a-zA-Z-]*:iam::\d{12}:role\/.+$/;
const AWS_ACCOUNT_ID_PATTERN = /^\d{12}$/;
const AWS_REGION_PATTERN = /^[a-z0-9-]+$/;

const CallbackIdParamsSchema = schema.object({
  callbackId: schema.string({ minLength: 1, maxLength: 128 }),
});

const IacCallbackStatusSchema = schema.oneOf([
  schema.literal('pending'),
  schema.literal('received'),
  schema.literal('cancelled'),
]);

export const IacCallbackItemSchema = schema.object({
  id: schema.string(),
  provider: schema.literal('aws'),
  status: IacCallbackStatusSchema,
  created_at: schema.string(),
  created_by: schema.maybe(schema.string()),
  space_id: schema.maybe(schema.string()),
  expires_at: schema.string(),
  received_at: schema.maybe(schema.string()),
  role_arn: schema.maybe(schema.string()),
  stack_arn: schema.maybe(schema.string()),
  aws_account_id: schema.maybe(schema.string()),
  region: schema.maybe(schema.string()),
});

export const CreateIacCallbackRequestSchema = {
  body: schema.object({
    provider: schema.literal('aws'),
  }),
};

export const CreateIacCallbackResponseSchema = schema.object({
  item: IacCallbackItemSchema,
  api_key: schema.string({
    meta: {
      description:
        'Base64 id:api_key of the zero-privilege key bound to this record. Returned exactly once; never persisted.',
    },
  }),
});

export const GetIacCallbackRequestSchema = {
  params: CallbackIdParamsSchema,
};

export const GetIacCallbackResponseSchema = schema.object({
  item: IacCallbackItemSchema,
});

export const DeleteIacCallbackRequestSchema = {
  params: CallbackIdParamsSchema,
};

export const DeleteIacCallbackResponseSchema = schema.object({
  id: schema.string(),
  status: IacCallbackStatusSchema,
});

export const ReceiveIacCallbackRequestSchema = {
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
    aws_account_id: schema.string({
      minLength: 12,
      maxLength: 12,
      validate: (value) =>
        AWS_ACCOUNT_ID_PATTERN.test(value) ? undefined : 'must be a 12-digit AWS account ID',
      meta: { description: 'AWS account the stack was created in.' },
    }),
    region: schema.string({
      minLength: 1,
      maxLength: 64,
      validate: (value) => (AWS_REGION_PATTERN.test(value) ? undefined : 'must be an AWS region'),
      meta: { description: 'AWS region the stack was created in.' },
    }),
  }),
};

export const ReceiveIacCallbackResponseSchema = schema.object({
  status: IacCallbackStatusSchema,
});
