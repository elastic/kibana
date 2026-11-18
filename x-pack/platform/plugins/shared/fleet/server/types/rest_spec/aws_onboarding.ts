/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCloudFormationStackArn } from '../../../common/services/cloud_connectors/iac_deployment';

export const PutAwsOnboardingCredentialsRequestSchema = {
  body: schema.object({
    accessKeyId: schema.string({ minLength: 16, maxLength: 128 }),
    region: schema.string({ minLength: 1, maxLength: 32, validate: validateRegion }),
    stackNamePrefix: schema.maybe(
      schema.string({ minLength: 1, maxLength: 40, validate: validateStackNamePrefix })
    ),
    bootstrapStackArn: schema.maybe(
      schema.string({ minLength: 1, maxLength: 2048, validate: validateStackArn })
    ),
    discoveryRoleArn: schema.string({ minLength: 20, maxLength: 2048, validate: validateRoleArn }),
    provisioningRoleArn: schema.maybe(
      schema.string({ minLength: 20, maxLength: 2048, validate: validateRoleArn })
    ),
    // Write-only: stored encrypted (Encrypted Saved Object), never returned by any route.
    secrets: schema.object({
      secretAccessKey: schema.string({ minLength: 1, maxLength: 256 }),
    }),
  }),
};

export const GetAwsOnboardingBootstrapLaunchRequestSchema = {
  query: schema.object({
    mode: schema.oneOf([schema.literal('fully-managed'), schema.literal('partially-managed')], {
      defaultValue: 'fully-managed',
    }),
    region: schema.maybe(schema.string({ minLength: 1, maxLength: 32, validate: validateRegion })),
  }),
};

export const GetAwsOnboardingBootstrapTemplateRequestSchema = {
  query: schema.object({
    mode: schema.oneOf([schema.literal('fully-managed'), schema.literal('partially-managed')], {
      defaultValue: 'fully-managed',
    }),
  }),
};

export const DeleteAwsOnboardingCredentialsRequestSchema = {
  query: schema.object({
    force: schema.boolean({ defaultValue: false }),
  }),
};

export const GetAwsOnboardingStackRequestSchema = {
  params: schema.object({
    stackId: schema.string({ minLength: 1, maxLength: 2048, validate: validateStackArn }),
  }),
};

function validateRegion(value: string): string | undefined {
  return /^[a-z0-9-]+$/.test(value) ? undefined : 'must be an AWS region name';
}

function validateStackNamePrefix(value: string): string | undefined {
  return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(value)
    ? undefined
    : 'must start with a letter and contain only letters, digits and hyphens';
}

function validateRoleArn(value: string): string | undefined {
  return /^arn:aws[a-z-]*:iam::\d{12}:role\/[\w+=,.@/-]+$/.test(value)
    ? undefined
    : 'must be an IAM role ARN';
}

function validateStackArn(value: string): string | undefined {
  return isCloudFormationStackArn(value) ? undefined : 'must be a CloudFormation stack ARN';
}
