/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry, DeploymentMethod } from '../aws_service_matrix';
import {
  ECF_DEFAULT_NAMESPACE,
  ecfFamilySupportsNamespace,
  getEcfTemplateFamily,
} from '../ecf_cloudformation';

/**
 * The namespace an instance deploys into: its own, which only a duplicate has, else the global
 * namespace. Empty means the policy inherits the namespace of its agent policy (or `default` for a
 * managed integration).
 */
export const getEffectiveNamespace = (
  instanceId: string,
  serviceVars: Record<string, { namespace?: string }>,
  globalNamespace?: string
): string => serviceVars[instanceId]?.namespace || globalNamespace || '';

/**
 * Whether a service deploys as a package policy, which gives it a namespace of its own. An ECF
 * stack has one namespace for the whole stack instead, see `getEcfStackNamespace`.
 * Managed integration deploys a service as a policy only when it prefers that method, agent-based
 * deploys every service as one.
 */
export const deploysAsPolicy = (
  service: AwsServiceMatrixEntry,
  deploymentMethod?: DeploymentMethod
): boolean =>
  deploymentMethod === 'agent_based' ||
  service.deploymentMethods.some((dm) => dm.method === 'managed_integration' && dm.preferred);

/** The ECF stack launched for a template family. */
interface EcfStackNamespace {
  family: string;
  namespace?: string;
}

/**
 * The namespace the data of a service deployed through ECF lands in: the one its stack was
 * launched or last updated with, not the current global namespace, which only reaches the stack
 * once it is updated. Undefined for a service whose template takes no namespace (OTel and
 * CrowdStrike), which can land in any namespace.
 */
export const getEcfStackNamespace = (
  service: AwsServiceMatrixEntry,
  ecfStacks: EcfStackNamespace[] = []
): string | undefined => {
  const family = getEcfTemplateFamily(service);
  if (!ecfFamilySupportsNamespace(family)) return undefined;
  return ecfStacks.find((stack) => stack.family === family)?.namespace ?? ECF_DEFAULT_NAMESPACE;
};

/**
 * Whether the global namespace reaches a service: through its package policy, or through the
 * `DataStreamNamespace` parameter of its ECF stack.
 */
export const followsGlobalNamespace = (
  service: AwsServiceMatrixEntry,
  deploymentMethod?: DeploymentMethod
): boolean =>
  deploysAsPolicy(service, deploymentMethod) ||
  ecfFamilySupportsNamespace(getEcfTemplateFamily(service));
