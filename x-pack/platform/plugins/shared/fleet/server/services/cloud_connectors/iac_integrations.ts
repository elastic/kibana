/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { buildPackagePolicyFilterExcludingHiddenPackages } from '../../../common/constants/cloud_connector';
import { getEnabledInputsByPolicyTemplate } from '../../../common/services/policy_template';
import type { RenderIacTemplateIntegration } from '../../../common/types/rest_spec/iac_provisioner';
import { appContextService } from '../app_context';

/** A package plus the policy templates the user enabled — the browser-facing render shape. */
export type IacIntegrationSelection = RenderIacTemplateIntegration;

/** Package name → policy template name → enabled input types, built up while merging. */
type TemplatesByPackage = Map<string, Map<string, Set<string>>>;

const POLICIES_PER_PAGE = 250;
const PACKAGE_NAMES_IN_LOG = 5;

const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const addSelection = (
  templatesByPackage: TemplatesByPackage,
  { name, policyTemplates }: IacIntegrationSelection
): void => {
  const templates = templatesByPackage.get(name) ?? new Map<string, Set<string>>();
  for (const { name: templateName, enabledInputs } of policyTemplates) {
    const inputTypes = templates.get(templateName) ?? new Set<string>();
    for (const inputType of enabledInputs) {
      inputTypes.add(inputType);
    }
    templates.set(templateName, inputTypes);
  }
  templatesByPackage.set(name, templates);
};

/** Packages, templates and inputs are code-point sorted so the result hashes stably. */
const toSortedSelections = (templatesByPackage: TemplatesByPackage): IacIntegrationSelection[] =>
  [...templatesByPackage.entries()]
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

/** Merges same-package entries into one, unioning the enabled inputs of same-named policy templates. */
export const mergeIntegrationSelections = (
  selections: IacIntegrationSelection[]
): IacIntegrationSelection[] => {
  const templatesByPackage: TemplatesByPackage = new Map();
  for (const selection of selections) {
    addSelection(templatesByPackage, selection);
  }
  return toSortedSelections(templatesByPackage);
};

interface PackagePolicyIacAttributes {
  package?: { name?: string };
  inputs?: Array<{ type: string; enabled: boolean; policy_template?: string }>;
}

export interface CloudConnectorIntegrationSelectionsOptions {
  /** Stop reading once more distinct packages than this reference the connector. */
  maxPackages?: number;
}

export interface CloudConnectorIntegrationSelections {
  /** The merged, sorted set; empty when `exceedsCap` is true. */
  integrations: IacIntegrationSelection[];
  /** True when the connector's packages outnumber `maxPackages`; the set was not fully read. */
  exceedsCap: boolean;
}

/** The connector's live integration set, derived from the package policies that reference it. */
export const getCloudConnectorIntegrationSelections = async (
  soClient: SavedObjectsClientContract,
  cloudConnectorId: string,
  { maxPackages }: CloudConnectorIntegrationSelectionsOptions = {}
): Promise<CloudConnectorIntegrationSelections> => {
  const logger = appContextService.getLogger().get('IacIntegrations');
  // Same filter CloudConnectorService uses for packagePolicyCount: hidden internal packages
  // (verifier_otel) and `:prev` rollback snapshots are excluded.
  const filter = buildPackagePolicyFilterExcludingHiddenPackages(
    `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:"${escapeQuotes(
      cloudConnectorId
    )}"`
  );
  // Paged so a connector referenced by more policies than a single find returns is still read
  // in full; the pages are folded straight into the map, never held as a list.
  const finder = soClient.createPointInTimeFinder<PackagePolicyIacAttributes>({
    type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    filter,
    perPage: POLICIES_PER_PAGE,
    fields: ['package.name', 'inputs.type', 'inputs.enabled', 'inputs.policy_template'],
  });

  const templatesByPackage: TemplatesByPackage = new Map();
  let policyCount = 0;
  try {
    for await (const { saved_objects: packagePolicies } of finder.find()) {
      policyCount += packagePolicies.length;
      for (const { attributes } of packagePolicies) {
        const name = attributes.package?.name;
        if (!name) {
          continue;
        }
        // Only what the user enabled. A policy template appears here only if it has at least one
        // enabled input, so a package with no such template contributes nothing to the render.
        const policyTemplates = getEnabledInputsByPolicyTemplate(attributes);
        if (policyTemplates.length === 0) {
          continue;
        }
        addSelection(templatesByPackage, { name, policyTemplates });
        if (maxPackages !== undefined && templatesByPackage.size > maxPackages) {
          // Nothing built from a set this large could be rendered, so the rest is not read.
          logger.debug(
            `Connector ${cloudConnectorId}: more than ${maxPackages} packages after ${policyCount} package policies; stopped reading`
          );
          return { integrations: [], exceedsCap: true };
        }
      }
    }
  } finally {
    await finder.close();
  }

  const packageNames = [...templatesByPackage.keys()].sort(byCodePoint);
  logger.debug(
    `Connector ${cloudConnectorId}: ${policyCount} package policies → ${
      packageNames.length
    } packages (${packageNames.slice(0, PACKAGE_NAMES_IN_LOG).join(', ')}${
      packageNames.length > PACKAGE_NAMES_IN_LOG ? ', …' : ''
    })`
  );
  return { integrations: toSortedSelections(templatesByPackage), exceedsCap: false };
};
