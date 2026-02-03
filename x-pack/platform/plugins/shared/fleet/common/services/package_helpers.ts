/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';

import type { PackageInfo, PackagePolicy, RegistryPolicyTemplate } from '../types';
import { OTEL_COLLECTOR_INPUT_TYPE } from '../constants';

/**
 * Return true if a package need Elastic Agent to be run as root/administrator
 */
export function isRootPrivilegesRequired(packageInfo: PackageInfo) {
  return (
    packageInfo.agent?.privileges?.root ||
    packageInfo.data_streams?.some((d) => d.agent?.privileges?.root)
  );
}

export function isRootPrivilegeRequired(packagePolicies: PackagePolicy[]) {
  return packagePolicies.some((policy) => policy.package?.requires_root || false);
}

export function getRootPrivilegedDataStreams(
  packageInfo: PackageInfo
): Array<{ name: string; title: string }> {
  if (packageInfo.agent?.privileges?.root) {
    return [];
  }
  return (
    packageInfo.data_streams
      ?.filter((d) => d.agent?.privileges?.root)
      .map((ds) => ({ name: ds.name, title: ds.title })) ?? []
  );
}

export function getRootIntegrations(
  packagePolicies: PackagePolicy[]
): Array<{ name: string; title: string }> {
  return uniqBy(
    packagePolicies
      .map((policy) => policy.package)
      .filter((pkg) => (pkg && pkg.requires_root) || false),
    (pkg) => pkg!.name
  ).map((pkg) => ({ name: pkg!.name, title: pkg!.title }));
}

const INSTALL_SERVERS_INPUTS = ['cloudbeat', 'apm', 'fleet-server'];

export function hasInstallServersInputs(packagePolicies: PackagePolicy[]): boolean {
  return packagePolicies.some((policy) =>
    policy.inputs.some(
      (input) => INSTALL_SERVERS_INPUTS.includes(input.type) || input.type.startsWith('cloudbeat')
    )
  );
}

/**
 * Return true if a package is fips compatible.
 * Policy templates that have fips_compatible not defined are considered compatible.
 * Only `fips_compatible: false` is considered not compatible, except for OTel inputs
 * that are considered incompatible by default.
 */
export function checkIntegrationFipsLooseCompatibility(
  integrationName: string,
  packageInfo?: Pick<PackageInfo, 'policy_templates'>
) {
  if (!packageInfo?.policy_templates || packageInfo.policy_templates?.length === 0) {
    return true;
  }
  if (
    packageInfo.policy_templates.find(
      (p) => p.name === integrationName && checkPolicyTemplateFipsCompatibility(p)
    )
  ) {
    return true;
  }
  return false;
}

/** Return true if a policy template is fips compatible.
 * It is fips compatible if it says so, or if it doesn't contain an OTel input.
 */
function checkPolicyTemplateFipsCompatibility(template: RegistryPolicyTemplate) {
  if (template.fips_compatible !== undefined) {
    return template.fips_compatible;
  }
  if ('input' in template) {
    // Policy template in input package.
    return template.input !== OTEL_COLLECTOR_INPUT_TYPE;
  } else if ('inputs' in template) {
    // Policy templates in integration package.
    if (!template.inputs?.find((input) => input.type === OTEL_COLLECTOR_INPUT_TYPE)) {
      return true;
    }
  } else {
    // No inputs or input type.
    return true;
  }
  return false;
}

/**
 * Given a package policy list, get the list of integrations that are explicitly marked as not compatible with FIPS
 *
 */
export function getNonFipsIntegrations(
  packagePolicies: PackagePolicy[]
): Array<{ name: string; title: string }> {
  return uniqBy(
    packagePolicies
      .map((policy) => policy.package)
      .filter((pkg) => pkg && pkg.fips_compatible === false),
    (pkg) => pkg!.name
  ).map((pkg) => ({ name: pkg!.name, title: pkg!.title }));
}
