/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCloudFormationStackArn } from '../../../common/services/cloud_connectors/iac_deployment';

import { MAX_IAC_RENDER_INTEGRATIONS, RenderIacTemplateIntegrationSchema } from './iac_provisioner';

const IntegrationsSchema = schema.arrayOf(RenderIacTemplateIntegrationSchema, {
  minSize: 1,
  maxSize: MAX_IAC_RENDER_INTEGRATIONS,
});

const TemplateUrlSchema = schema.maybe(
  schema.string({
    minLength: 1,
    maxLength: 2048,
    validate: validateHttpsUrl,
    meta: {
      description: 'Raw CloudFormation template URL, used when the IaC Provisioner is disabled.',
    },
  })
);

/** Stack parameters Kibana fills from the Elastic deployment; keys the template does not declare are dropped. */
const ParametersSchema = schema.recordOf(
  schema.oneOf([
    schema.literal('ElasticOrganizationId'),
    schema.literal('ElasticCloudProvider'),
    schema.literal('ElasticCloudRegion'),
    schema.literal('ElasticCloudEnvironment'),
    schema.literal('ElasticResourceType'),
    schema.literal('ElasticResourceId'),
  ]),
  schema.string({ minLength: 1, maxLength: 128 })
);

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
    // Write-only: stored encrypted (Encrypted Saved Object), never returned by any route.
    secrets: schema.object({
      secretAccessKey: schema.string({ minLength: 1, maxLength: 256 }),
    }),
  }),
};

export const DeleteAwsOnboardingCredentialsRequestSchema = {
  query: schema.object({
    force: schema.boolean({ defaultValue: false }),
  }),
};

export const CreateAwsOnboardingStackRequestSchema = {
  body: schema.object({
    integrations: IntegrationsSchema,
    templateUrl: TemplateUrlSchema,
    parameters: ParametersSchema,
  }),
};

export const GetAwsOnboardingStackRequestSchema = {
  params: schema.object({
    stackId: schema.string({ minLength: 1, maxLength: 2048, validate: validateStackArn }),
  }),
};

export const UpdateAwsOnboardingStackRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({ minLength: 1, maxLength: 255 }),
  }),
  body: schema.object({
    integrations: IntegrationsSchema,
    templateUrl: TemplateUrlSchema,
    parameters: schema.maybe(ParametersSchema),
  }),
};

function validateHttpsUrl(value: string): string | undefined {
  try {
    return new URL(value).protocol === 'https:' ? undefined : 'must be an https URL';
  } catch {
    return 'must be a valid URL';
  }
}

function validateRegion(value: string): string | undefined {
  return /^[a-z0-9-]+$/.test(value) ? undefined : 'must be an AWS region name';
}

function validateStackNamePrefix(value: string): string | undefined {
  return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(value)
    ? undefined
    : 'must start with a letter and contain only letters, digits and hyphens';
}

function validateStackArn(value: string): string | undefined {
  return isCloudFormationStackArn(value) ? undefined : 'must be a CloudFormation stack ARN';
}
