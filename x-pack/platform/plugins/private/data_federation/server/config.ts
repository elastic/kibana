/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

/**
 * Elastic-hosted template the S3 federated identity CloudFormation setup opens. It is the same for
 * every environment and region; the config key only exists so it can be moved without an upgrade.
 */
export const DEFAULT_AWS_CLOUDFORMATION_TEMPLATE_URL =
  'https://elastic-datasource-cft-816604515500-us-east-1-an.s3.us-east-1.amazonaws.com/aws/v1/datasource-cft.yml';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  enableFederatedIdentityAuth: schema.boolean({ defaultValue: false }),
  enableGoogleCloudStorageDataSourceType: schema.boolean({ defaultValue: false }),
  enableAzureDataSourceType: schema.boolean({ defaultValue: false }),
  workloadIdentityIssuerUrl: schema.maybe(schema.string()),
  awsCloudFormationTemplateUrl: schema.uri({
    scheme: ['https'],
    defaultValue: DEFAULT_AWS_CLOUDFORMATION_TEMPLATE_URL,
  }),
});

export type DataFederationConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<DataFederationConfigType> = {
  exposeToBrowser: {
    enabled: true,
    enableFederatedIdentityAuth: true,
    enableGoogleCloudStorageDataSourceType: true,
    enableAzureDataSourceType: true,
    workloadIdentityIssuerUrl: true,
    awsCloudFormationTemplateUrl: true,
  },
  schema: configSchema,
};
