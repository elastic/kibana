/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { internalElserInferenceId } from '../common/consts';

export const DEFAULT_ARTIFACT_REPOSITORY_URL = 'https://kibana-knowledge-base-artifacts.elastic.co';

const configSchema = schema.object({
  artifactRepositoryUrl: schema.string({
    defaultValue: DEFAULT_ARTIFACT_REPOSITORY_URL,
  }),
  artifactRepositoryProxyUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
  elserInferenceId: schema.string({
    defaultValue: internalElserInferenceId,
  }),
  // Functional tests install explicitly and cannot share the cluster-wide install lock
  // with the startup task. Production keeps auto-install on.
  autoInstallEnabled: schema.boolean({ defaultValue: true }),
  // Serverless only: read the artifacts shipped in the distribution instead of the remote
  // repository. Ignored when artifactRepositoryUrl is set to something other than the default.
  useBundledArtifacts: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor<ProductDocBaseConfig> = {
  schema: configSchema,
  exposeToBrowser: {},
};

export type ProductDocBaseConfig = TypeOf<typeof configSchema>;
