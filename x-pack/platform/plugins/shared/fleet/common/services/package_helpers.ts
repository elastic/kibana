/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';

import type { PackageInfo, PackageListItem, PackagePolicy, RegistryPolicyTemplate } from '../types';
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

/**
 * Packages that declare data streams or policy templates but have nothing to configure on the agent side
 * (documentation-only, or assets-only), so the catalog tile opens the Integration Details page instead of
 * "Add integration". Temporary: remove once these packages are re-typed and behavior is inferred from `type`.
 */
const ADD_INTEGRATION_EXCLUDED_PACKAGES = [
  'supabase',
  'awsfirehose',
  'cribl',
  'contrast_security',
  'elastic_agent',
  'elastic_govcloud',
  'keeper',
] as const;

type PackageClassificationFields = Partial<
  Pick<PackageInfo | PackageListItem, 'name' | 'type' | 'data_streams' | 'policy_templates'>
>;

// `assets` is only available on the package info, not on the catalog list items
type AssetOnlyClassificationFields = PackageClassificationFields &
  Partial<Pick<PackageInfo, 'assets'>>;

/**
 * Return true if a package declares at least one data stream or policy template.
 * Integration packages without either (documentation-only, or assets-only) have nothing to configure.
 */
export function hasDataStreamsOrPolicyTemplates(pkg: PackageClassificationFields): boolean {
  return (pkg.data_streams?.length ?? 0) > 0 || (pkg.policy_templates?.length ?? 0) > 0;
}

/**
 * Return true if clicking the package tile in the catalog should open the "Add integration" page
 * (input packages, or integration packages with data streams or policy templates),
 * false if it should open the Integration Details page.
 */
export function shouldAddIntegrationFromCatalog(pkg: PackageClassificationFields): boolean {
  if (pkg.type === 'content') {
    return false;
  }
  if (pkg.name && (ADD_INTEGRATION_EXCLUDED_PACKAGES as readonly string[]).includes(pkg.name)) {
    return false;
  }
  // Uploaded packages beyond the catalog's package info limit only carry saved object attributes
  // (no type, data streams or policy templates): they can't be classified, keep the add flow.
  if (!pkg.type || pkg.type === 'input') {
    return true;
  }
  return hasDataStreamsOrPolicyTemplates(pkg);
}

/**
 * Return true if the package ships at least one Kibana or Elasticsearch asset that can be installed.
 * Knowledge base assets are ignored: they are built from the docs folder, which every package has.
 */
export function hasInstallableAssets(pkg: Pick<AssetOnlyClassificationFields, 'assets'>): boolean {
  return Object.values(pkg.assets ?? {}).some((assetsByType) =>
    Object.entries(assetsByType ?? {}).some(
      ([assetType, assets]) => assetType !== 'knowledge_base' && (assets?.length ?? 0) > 0
    )
  );
}

/**
 * Return true if the Integration Details page should offer "Install assets" instead of "Add integration":
 * integration packages that have nothing to configure on an agent (no data streams and no policy templates,
 * or on the ADD_INTEGRATION_EXCLUDED_PACKAGES list) but ship installable assets.
 * Temporary: remove once packages are re-typed and behavior is inferred from `type`.
 */
export function isAssetOnlyIntegrationPackage(pkg: AssetOnlyClassificationFields): boolean {
  return (
    pkg.type === 'integration' && !shouldAddIntegrationFromCatalog(pkg) && hasInstallableAssets(pkg)
  );
}

/**
 * Packages on ADD_INTEGRATION_EXCLUDED_PACKAGES that still configure something on an agent (a custom
 * policy UI, or a real input), so they stay available when adding an integration to an agent policy
 * and keep "Add integration" on their details page.
 * Temporary: remove once packages are re-typed and behavior is inferred from `type`.
 */
export const ADD_INTEGRATION_CONFIGURABLE_PACKAGES: readonly string[] = ['cribl', 'supabase'];

/**
 * Return true if the package should be offered when adding an integration to an agent policy:
 * packages with nothing to configure on an agent (assets-only, documentation-only) are hidden.
 * Takes the fields of a catalog card, which carries the classification but not the package contents.
 */
export function canAddToAgentPolicy(pkg: {
  name?: string;
  addIntegrationFromCatalog?: boolean;
}): boolean {
  if (pkg.name && ADD_INTEGRATION_CONFIGURABLE_PACKAGES.includes(pkg.name)) {
    return true;
  }
  // Cards without a classification (e.g. custom integrations) keep being offered
  return pkg.addIntegrationFromCatalog !== false;
}
