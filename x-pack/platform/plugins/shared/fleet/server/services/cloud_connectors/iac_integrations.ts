/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../common/constants';
import { buildPackagePolicyFilterExcludingHiddenPackages } from '../../../common/constants/cloud_connector';
import { getEnabledInputsByPolicyTemplate } from '../../../common/services/policy_template';
import type { CloudProvider } from '../../../common/types/models/cloud_connector';
import type { RenderIacTemplateIntegration } from '../../../common/types/rest_spec/iac_provisioner';
import { appContextService } from '../app_context';
import { getPackageInfo } from '../epm/packages';
import type { IacProvisionerRenderIntegration } from '../iac_provisioner';

/** A package plus the policy templates the user enabled — the browser-facing render shape. */
export type IacIntegrationSelection = RenderIacTemplateIntegration;

const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Merges same-package entries into one, unioning the enabled inputs of same-named policy
 * templates; packages, templates and inputs are code-point sorted so the result hashes stably.
 */
export const mergeIntegrationSelections = (
  selections: IacIntegrationSelection[]
): IacIntegrationSelection[] => {
  const templatesByPackage = new Map<string, Map<string, Set<string>>>();
  for (const { name, policyTemplates } of selections) {
    const templates = templatesByPackage.get(name) ?? new Map<string, Set<string>>();
    for (const { name: templateName, enabledInputs } of policyTemplates) {
      const inputTypes = templates.get(templateName) ?? new Set<string>();
      for (const inputType of enabledInputs) {
        inputTypes.add(inputType);
      }
      templates.set(templateName, inputTypes);
    }
    templatesByPackage.set(name, templates);
  }
  return [...templatesByPackage.entries()]
    .sort(([a], [b]) => byCodePoint(a, b))
    .map(([name, templates]) => ({
      name,
      policyTemplates: [...templates.entries()]
        .sort(([a], [b]) => byCodePoint(a, b))
        .map(([templateName, inputTypes]) => ({
          name: templateName,
          enabledInputs: [...inputTypes].sort(byCodePoint),
        })),
    }));
};

interface PackagePolicyIacAttributes {
  package?: { name?: string };
  inputs?: Array<{ type: string; enabled: boolean; policy_template?: string }>;
}

/** The connector's live integration set, derived from the package policies that reference it. */
export const getCloudConnectorIntegrationSelections = async (
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string
): Promise<IacIntegrationSelection[]> => {
  // Same filter CloudConnectorService uses for packagePolicyCount: hidden internal packages
  // (verifier_otel) and `:prev` rollback snapshots are excluded.
  const filter = buildPackagePolicyFilterExcludingHiddenPackages(
    `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:"${escapeQuotes(
      cloudConnectorId
    )}"`
  );
  const { saved_objects: packagePolicies } = await soClient.find<PackagePolicyIacAttributes>({
    type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    filter,
    perPage: SO_SEARCH_LIMIT,
    fields: ['package.name', 'inputs.type', 'inputs.enabled', 'inputs.policy_template'],
  });

  const selections = packagePolicies.flatMap(({ attributes }) => {
    const name = attributes.package?.name;
    if (!name) {
      return [];
    }
    // Only what the user enabled. A policy template appears here only if it has at least one
    // enabled input, so a package with no such template contributes nothing to the render.
    const policyTemplates = getEnabledInputsByPolicyTemplate(attributes);
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
  /** Packages none of whose requested policy templates exist in the package manifest. */
  skipped: string[];
}

/**
 * Turns browser-shaped selections into the IaCP wire shape: resolves the installed (or latest)
 * package version and lists the input types the user enabled per policy template. The caller's
 * `enabledInputs` are passed through untouched — IaCP builds a blueprint patch from every input
 * listed, so anything the user did not enable would over-grant permissions, and IaCP validates
 * the names itself (render.no_matching_inputs_for_policy_template). `provider` is log context
 * only. Shared by the render route handler, the Existing FI check and the upgrade task.
 */
export const resolveIacRenderIntegrations = async (
  soClient: SavedObjectsClientContract,
  provider: CloudProvider,
  selections: IacIntegrationSelection[]
): Promise<ResolvedIacRenderIntegrations> => {
  const logger = appContextService.getLogger().get('IacIntegrations');
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
      const manifestTemplates = new Set(
        (packageInfo.policy_templates ?? []).map(({ name }) => name)
      );
      const resolvedPolicyTemplates = policyTemplates.filter(({ name }) =>
        manifestTemplates.has(name)
      );
      const unknownTemplates = policyTemplates
        .filter(({ name }) => !manifestTemplates.has(name))
        .map(({ name }) => name);
      if (unknownTemplates.length > 0) {
        // The rendered template then covers less than the user enabled; warn so the
        // package/version mismatch is visible in the logs.
        logger.warn(
          `Dropped policy templates not declared by ${pkgName}@${
            packageInfo.version
          }: ${unknownTemplates.join(', ')}`
        );
      }

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
  logger.debug(`Resolved ${provider} render integrations: ${JSON.stringify(result.integrations)}`);
  if (result.skipped.length > 0) {
    logger.debug(
      `Skipped packages whose manifest declares none of the requested policy templates: ${result.skipped.join(
        ', '
      )}`
    );
  }
  return result;
};
