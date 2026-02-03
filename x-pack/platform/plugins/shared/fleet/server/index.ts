/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { buildAgentStatusRuntimeField } from './services/agents/build_status_runtime_field';
export type {
  AgentService,
  AgentClient,
  PackageService,
  PackageClient,
  AgentPolicyServiceInterface,
  AgentlessPoliciesService,
  ArtifactsClientInterface,
  Artifact,
  ListArtifactsProps,
  MessageSigningServiceInterface,
} from './services';
export { getRegistryUrl } from './services';
export { NamingCollisionError } from './services/epm/packages/custom_integrations/validation/check_naming_collision';

export type { FleetSetupContract, FleetSetupDeps, FleetStartContract } from './plugin';
export type {
  ExternalCallback,
  PutPackagePolicyUpdateCallback,
  PostPackagePolicyDeleteCallback,
  PostPackagePolicyPostDeleteCallback,
  PostPackagePolicyCreateCallback,
  FleetRequestHandlerContext,
  PostPackagePolicyPostCreateCallback,
} from './types';
export { AgentNotFoundError, FleetUnauthorizedError } from './errors';
export { config } from './config';
export type { FleetConfigType } from './config';

export type { PackagePolicyClient } from './services/package_policy_service';

export { relativeDownloadUrlFromArtifact } from './services/artifacts/mappings';

export type {
  FleetFromHostFileClientInterface,
  FleetToHostFileClientInterface,
  FleetFile,
  HapiReadableStream,
  FleetFileUpdatableFields,
} from './services/files/types';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { FleetPlugin } = await import('./plugin');
  return new FleetPlugin(initializerContext);
};
