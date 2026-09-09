/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../common/constants';
import { buildPackagePolicyFilterExcludingHiddenPackages } from '../../../common/constants/cloud_connector';
import { getEnabledPolicyTemplates } from '../../../common/services/policy_template';
import type { CloudProvider } from '../../../common/types/models/cloud_connector';
import type { RenderIacTemplateIntegration } from '../../../common/types/rest_spec/iac_provisioner';
import { appContextService } from '../app_context';
import { getPackageInfo } from '../epm/packages';
import type { IacProvisionerRenderIntegration } from '../iac_provisioner';

/** A package plus the policy templates the user enabled — the browser-facing render shape. */
export type IacIntegrationSelection = RenderIacTemplateIntegration;

/** Merges same-package entries into one with the union of policy templates; output is code-point sorted so it hashes stably. */
export const mergeIntegrationSelections = (
  selections: IacIntegrationSelection[]
): IacIntegrationSelection[] => {
  const templatesByPackage = new Map<string, Set<string>>();
  for (const { name, policyTemplates } of selections) {
    const templates = templatesByPackage.get(name) ?? new Set<string>();
    for (const template of policyTemplates) {
      templates.add(template);
    }
    templatesByPackage.set(name, templates);
  }
  return [...templatesByPackage.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, templates]) => ({ name, policyTemplates: [...templates].sort() }));
};

interface PackagePolicyIacAttributes {
  package?: { name?: string };
  inputs?: Array<{ enabled: boolean; policy_template?: string }>;
}

/** The connector's live integration set, derived from the package policies that reference it. */
export const getCloudConnectorIntegrationSelections = async (
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string
): Promise<IacIntegrationSelection[]> => {
  // Same filter CloudConnectorService uses for packagePolicyCount: hidden internal packages
  // (verifier_otel) and `:prev` rollback snapshots are excluded.
  const filter = buildPackagePolicyFilterExcludingHiddenPackages(
    `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:"${cloudConnectorId}"`
  );
  const { saved_objects: packagePolicies } = await soClient.find<PackagePolicyIacAttributes>({
    type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    filter,
    perPage: SO_SEARCH_LIMIT,
    fields: ['package.name', 'inputs.enabled', 'inputs.policy_template'],
  });

  const selections = packagePolicies.flatMap(({ attributes }) => {
    const name = attributes.package?.name;
    if (!name) {
      return [];
    }
    const policyTemplates = getEnabledPolicyTemplates(attributes);
    return policyTemplates.length > 0 ? [{ name, policyTemplates }] : [];
  });

  const merged = mergeIntegrationSelections(selections);
  const logger = appContextService.getLogger().get('IacIntegrations');
  logger.debug(
    `Connector ${cloudConnectorId}: ${
      packagePolicies.length
    } package policies → integration set ${JSON.stringify(merged)}`
  );
  return merged;
};

export interface ResolvedIacRenderIntegrations {
  integrations: IacProvisionerRenderIntegration[];
  /** Packages with no provider-relevant inputs under the requested templates. */
  skipped: string[];
}

/**
 * Turns browser-shaped selections into the IaCP wire shape: resolves the installed (or latest)
 * package version and keeps only inputs whose type names the provider. Moved verbatim from the
 * render route handler so the Existing FI check and the upgrade task share it.
 */
export const resolveIacRenderIntegrations = async (
  soClient: SavedObjectsClientContract,
  provider: CloudProvider,
  selections: IacIntegrationSelection[]
): Promise<ResolvedIacRenderIntegrations> => {
  const resolved = await Promise.all(
    mergeIntegrationSelections(selections).map(async ({ name: pkgName, policyTemplates }) => {
      // Empty pkgVersion resolves to the installed version, falling back to the latest
      // available: at connector-creation time the package may not be installed yet.
      const packageInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName,
        pkgVersion: '',
        skipArchive: true,
      });
      const requested = new Set(policyTemplates);
      // MVP heuristic pending confirmation with the provisioner team (OQ-A in
      // security-team#18632): only provider-relevant input types are sent.
      const resolvedPolicyTemplates = (packageInfo.policy_templates ?? [])
        .filter(({ name }) => requested.has(name))
        .map((template) => {
          const inputs = 'inputs' in template ? template.inputs ?? [] : [];
          const enabledInputs = [
            ...new Set(
              inputs.map(({ type }) => type).filter((type) => type.toLowerCase().includes(provider))
            ),
          ];
          return { name: template.name, enabledInputs };
        })
        .filter(({ enabledInputs }) => enabledInputs.length > 0);

      return {
        name: pkgName,
        version: packageInfo.version,
        policyTemplates: resolvedPolicyTemplates,
      };
    })
  );

  const result = {
    integrations: resolved.filter(({ policyTemplates }) => policyTemplates.length > 0),
    skipped: resolved
      .filter(({ policyTemplates }) => policyTemplates.length === 0)
      .map(({ name }) => name),
  };
  const logger = appContextService.getLogger().get('IacIntegrations');
  logger.debug(`Resolved ${provider} render integrations: ${JSON.stringify(result.integrations)}`);
  if (result.skipped.length > 0) {
    logger.debug(`Skipped packages with no ${provider} inputs: ${result.skipped.join(', ')}`);
  }
  return result;
};
