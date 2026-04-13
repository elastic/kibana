/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type {
  NewPackagePolicy,
  PackagePolicy,
  IndexTemplate,
  IndexTemplateEntry,
  PackagePolicySOAttributes,
  RegistryDataStream,
} from '../../types';
import { ElasticsearchAssetType } from '../../../common/types';
import { appContextService } from '../app_context';
import { updateCurrentWriteIndices } from '../epm/elasticsearch/template/template';
import { getInstalledPackageWithAssets, getInstallation } from '../epm/packages/get';
import { getRegistryDataStreamAssetBaseName } from '../../../common/services';
import { isUserSettingsTemplate } from '../epm/elasticsearch/template/utils';
import { updateEsAssetReferences } from '../epm/packages/es_assets_reference';
import {
  SO_SEARCH_LIMIT,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../constants';
import { PackageNotFoundError } from '../../errors';
import { isSpaceAwarenessEnabled } from '../spaces/helpers';

async function getPackagePolicySavedObjectType(): Promise<string> {
  return (await isSpaceAwarenessEnabled())
    ? PACKAGE_POLICY_SAVED_OBJECT_TYPE
    : LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE;
}

/**
 * Returns true if no active package policy for `packageName` (besides those in
 * `excludePolicyIds`) still uses `namespace`.
 */
async function isNamespaceSafeToRemove(
  soClient: SavedObjectsClientContract,
  packageName: string,
  namespace: string,
  excludePolicyIds: string[] = []
): Promise<boolean> {
  const savedObjectType = await getPackagePolicySavedObjectType();
  const result = await soClient.find<PackagePolicySOAttributes>({
    type: savedObjectType,
    filter: `${savedObjectType}.attributes.package.name:${packageName}`,
    perPage: SO_SEARCH_LIMIT,
    namespaces: ['*'],
  });

  return !result.saved_objects.some(
    (so) =>
      (so.attributes.namespace || 'default') === namespace && !excludePolicyIds.includes(so.id)
  );
}

/**
 * Inserts `<namespace>@custom` into a `composed_of` array at the correct position:
 *   - after the last package-level `@custom` (e.g. `system@custom`, no hyphen before `@custom`)
 *   - before the dataset-level `@custom` (e.g. `logs-system.application@custom`)
 *
 * If `<namespace>@custom` is already present, the array is returned unchanged.
 * This includes the case where a namespace name matches a package name (e.g.
 * namespace "nginx" for package "nginx") — the existing `nginx@custom` entry
 * already serves both the package-level and namespace-level roles, so no
 * duplicate is inserted.
 */
export function insertNamespaceCustomTemplate(
  composedOf: string[],
  namespace: string,
  templateName: string
): string[] {
  const namespaceEntry = `${namespace}@custom`;
  if (composedOf.includes(namespaceEntry)) {
    return composedOf;
  }

  const datasetEntry = `${templateName}@custom`;
  // Package-level @custom: name contains no hyphen before `@custom`
  // e.g. "system@custom" matches, "logs@custom" matches
  // but "logs-system.application@custom" does NOT
  const isPackageLevelCustom = (name: string): boolean =>
    name.endsWith('@custom') && !name.slice(0, -7).includes('-');

  let insertAt: number;
  const datasetIdx = composedOf.indexOf(datasetEntry);

  if (datasetIdx !== -1) {
    // Insert immediately before the dataset-level entry
    insertAt = datasetIdx;
  } else {
    // Find the last package-level @custom entry and insert after it
    let lastPkgCustomIdx = -1;
    for (let i = 0; i < composedOf.length; i++) {
      if (isPackageLevelCustom(composedOf[i])) {
        lastPkgCustomIdx = i;
      }
    }
    insertAt = lastPkgCustomIdx !== -1 ? lastPkgCustomIdx + 1 : composedOf.length;
  }

  const result = [...composedOf];
  result.splice(insertAt, 0, namespaceEntry);
  return result;
}

/**
 * When a package policy is created or its namespace changes, update all index templates
 * for the package's data streams to include (or update) the `<namespace>@custom` component
 * template reference. Also tracks the reference in the Installation saved object so it
 * appears on the Integration > Assets page.
 *
 * On namespace change, removes the old `<oldNamespace>@custom` reference from the templates
 * (and the Installation saved object) if no other package policy for this package still uses
 * that namespace.
 *
 * NOTE: When a single integration is deployed under multiple namespaces, all active
 * namespace `@custom` references appear in the same index template's `composed_of`.
 * Templates without a corresponding ES component template are silently ignored via
 * `ignore_missing_component_templates`.
 */
export async function handleNamespaceTemplateUpdate({
  soClient,
  esClient,
  packagePolicy,
  oldPackagePolicy,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicy: PackagePolicy | NewPackagePolicy;
  oldPackagePolicy?: PackagePolicy;
}) {
  if (!packagePolicy.package?.name) {
    return;
  }

  // Empty string means "default" — same convention used elsewhere in Fleet
  const newNamespace = packagePolicy.namespace || 'default';
  // undefined means no old policy (create path); keep it undefined so the no-op check works correctly
  const oldNamespace =
    oldPackagePolicy !== undefined ? oldPackagePolicy.namespace || 'default' : undefined;

  // No-op if namespace hasn't changed
  if (oldNamespace !== undefined && oldNamespace === newNamespace) {
    return;
  }

  const installedPackageWithAssets = await getInstalledPackageWithAssets({
    savedObjectsClient: soClient,
    pkgName: packagePolicy.package.name,
  });

  if (!installedPackageWithAssets) {
    throw new PackageNotFoundError(`package not found with assets ${packagePolicy.package.name}`);
  }

  const { packageInfo } = installedPackageWithAssets;
  const dataStreams = packageInfo.data_streams ?? [];

  if (dataStreams.length === 0) {
    return;
  }

  const logger = appContextService.getLogger();
  const updatedIndexTemplates: IndexTemplateEntry[] = [];
  // On the update path, the ID lives on oldPackagePolicy, not on the incoming policy object
  const currentPolicyId = oldPackagePolicy?.id;

  // Pre-compute whether the old namespace can be removed (same answer for all data streams)
  let oldNamespaceSafeToRemove = false;
  if (oldNamespace) {
    oldNamespaceSafeToRemove = await isNamespaceSafeToRemove(
      soClient,
      packagePolicy.package.name,
      oldNamespace,
      currentPolicyId ? [currentPolicyId] : []
    );
  }

  for (const dataStream of dataStreams) {
    const templateName = getRegistryDataStreamAssetBaseName(dataStream);

    let rawTemplate;
    try {
      const res = await esClient.indices.getIndexTemplate({ name: templateName });
      rawTemplate = res.index_templates[0]?.index_template;
    } catch {
      // Template may not exist yet (e.g. package installed but not yet deployed)
      logger.debug(
        `[handleNamespaceTemplateUpdate] index template ${templateName} not found, skipping`
      );
      continue;
    }

    if (!rawTemplate) {
      continue;
    }

    // Strip system-managed date properties that cannot be set on PUT
    const {
      created_date: _cd,
      created_date_millis: _cdm,
      modified_date: _md,
      modified_date_millis: _mdm,
      ...indexTemplate
    } = rawTemplate as IndexTemplate;

    let updatedComposedOf = [...(indexTemplate.composed_of ?? [])];

    // Remove old namespace reference if safe to do so
    if (oldNamespace && oldNamespaceSafeToRemove) {
      updatedComposedOf = updatedComposedOf.filter((t) => t !== `${oldNamespace}@custom`);
    }

    // Insert new namespace reference
    updatedComposedOf = insertNamespaceCustomTemplate(
      updatedComposedOf,
      newNamespace,
      templateName
    );

    // Recompute ignore_missing_component_templates
    const ignoreMissing = updatedComposedOf.filter(isUserSettingsTemplate);

    const updatedTemplate: IndexTemplate = {
      ...indexTemplate,
      composed_of: updatedComposedOf,
      ignore_missing_component_templates: ignoreMissing,
    };

    await esClient.indices.putIndexTemplate({
      name: templateName,
      ...updatedTemplate,
    });

    updatedIndexTemplates.push({
      templateName,
      indexTemplate: updatedTemplate,
    });
  }

  if (updatedIndexTemplates.length === 0) {
    return;
  }

  // Trigger rollover for updated data streams
  await updateCurrentWriteIndices(esClient, logger, updatedIndexTemplates);

  // Update the Installation saved object's installed_es to track namespace @custom refs.
  // Re-fetch the installation here to get a fresh snapshot of installed_es so we don't
  // overwrite concurrent writes made since installedPackageWithAssets was loaded above.
  const freshInstallation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: packagePolicy.package.name,
  });
  const currentEsRefs = freshInstallation?.installed_es ?? [];

  const assetsToAdd: Array<{ id: string; type: ElasticsearchAssetType }> = [
    {
      id: `${newNamespace}@custom`,
      type: ElasticsearchAssetType.componentTemplate,
    },
  ];

  const assetsToRemove: Array<{ id: string; type: ElasticsearchAssetType }> = [];
  if (oldNamespace && oldNamespaceSafeToRemove) {
    assetsToRemove.push({
      id: `${oldNamespace}@custom`,
      type: ElasticsearchAssetType.componentTemplate,
    });
  }

  await updateEsAssetReferences(soClient, packagePolicy.package.name, currentEsRefs, {
    assetsToAdd,
    assetsToRemove,
  });
}

/**
 * After a package is (re)installed, re-inject any `<namespace>@custom` references that were
 * cleared from the rebuilt index templates and `installed_es`. Called from the state machine's
 * final step so that namespace refs created by existing package policies survive reinstalls
 * (e.g. triggered by `upgradePackageInstallVersion` or `reinstallPackagesForGlobalAssetUpdate`).
 *
 * On first install there are no policies yet, so this is a no-op.
 */
export async function handleNamespaceTemplateRestoreAfterPackageInstall({
  soClient,
  esClient,
  packageName,
  dataStreams,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packageName: string;
  dataStreams: RegistryDataStream[];
}) {
  if (dataStreams.length === 0) {
    return;
  }

  const savedObjectType = await getPackagePolicySavedObjectType();
  const result = await soClient.find<PackagePolicySOAttributes>({
    type: savedObjectType,
    filter: `${savedObjectType}.attributes.package.name:${packageName}`,
    perPage: SO_SEARCH_LIMIT,
    namespaces: ['*'],
  });

  const uniqueNamespaces = [
    ...new Set(result.saved_objects.map((so) => so.attributes.namespace || 'default')),
  ];

  if (uniqueNamespaces.length === 0) {
    return;
  }

  const logger = appContextService.getLogger();
  const updatedIndexTemplates: IndexTemplateEntry[] = [];

  for (const dataStream of dataStreams) {
    const templateName = getRegistryDataStreamAssetBaseName(dataStream);

    let rawTemplate;
    try {
      const res = await esClient.indices.getIndexTemplate({ name: templateName });
      rawTemplate = res.index_templates[0]?.index_template;
    } catch {
      logger.debug(
        `[handleNamespaceTemplateRestoreAfterPackageInstall] index template ${templateName} not found, skipping`
      );
      continue;
    }

    if (!rawTemplate) {
      continue;
    }

    const {
      created_date: _cd,
      created_date_millis: _cdm,
      modified_date: _md,
      modified_date_millis: _mdm,
      ...indexTemplate
    } = rawTemplate as IndexTemplate;

    let updatedComposedOf = [...(indexTemplate.composed_of ?? [])];

    for (const namespace of uniqueNamespaces) {
      updatedComposedOf = insertNamespaceCustomTemplate(updatedComposedOf, namespace, templateName);
    }

    const ignoreMissing = updatedComposedOf.filter(isUserSettingsTemplate);

    const updatedTemplate: IndexTemplate = {
      ...indexTemplate,
      composed_of: updatedComposedOf,
      ignore_missing_component_templates: ignoreMissing,
    };

    await esClient.indices.putIndexTemplate({ name: templateName, ...updatedTemplate });

    updatedIndexTemplates.push({ templateName, indexTemplate: updatedTemplate });
  }

  if (updatedIndexTemplates.length === 0) {
    return;
  }

  await updateCurrentWriteIndices(esClient, logger, updatedIndexTemplates);

  const freshInstallation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  const currentEsRefs = freshInstallation?.installed_es ?? [];

  const assetsToAdd = uniqueNamespaces.map((ns) => ({
    id: `${ns}@custom`,
    type: ElasticsearchAssetType.componentTemplate,
  }));

  await updateEsAssetReferences(soClient, packageName, currentEsRefs, { assetsToAdd });
}

/**
 * When package policies are deleted, remove any `<namespace>@custom` references from the
 * affected index templates and Installation saved object for namespaces that are no longer
 * used by any remaining policy for that package.
 *
 * Must be called BEFORE the saved objects are deleted so that the query to check remaining
 * policies can still exclude the being-deleted IDs correctly.
 */
export async function handleNamespaceTemplateDelete({
  soClient,
  esClient,
  packagePolicies,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicies: PackagePolicy[];
}) {
  // Build a de-duplicated list of (packageName, namespace) pairs to process
  const seen = new Set<string>();
  const toProcess: Array<{ packageName: string; namespace: string; policyIds: string[] }> = [];

  for (const policy of packagePolicies) {
    if (!policy.package?.name) continue;
    const namespace = policy.namespace || 'default';
    const key = `${policy.package.name}::${namespace}`;
    if (seen.has(key)) {
      // Accumulate all IDs being deleted for this pair
      toProcess
        .find((p) => p.packageName === policy.package!.name && p.namespace === namespace)!
        .policyIds.push(policy.id);
    } else {
      seen.add(key);
      toProcess.push({
        packageName: policy.package.name,
        namespace,
        policyIds: [policy.id],
      });
    }
  }

  // Cache package info per package name to avoid redundant fetches when multiple
  // namespaces belong to the same package.
  type InstalledPackageResult = NonNullable<
    Awaited<ReturnType<typeof getInstalledPackageWithAssets>>
  >;
  const packageInfoCache = new Map<string, InstalledPackageResult | null>();

  for (const { packageName, namespace, policyIds } of toProcess) {
    const safeToRemove = await isNamespaceSafeToRemove(soClient, packageName, namespace, policyIds);
    if (!safeToRemove) continue;

    if (!packageInfoCache.has(packageName)) {
      const result = await getInstalledPackageWithAssets({
        savedObjectsClient: soClient,
        pkgName: packageName,
      });
      packageInfoCache.set(packageName, result ?? null);
    }
    const installedPackageWithAssets = packageInfoCache.get(packageName);
    if (!installedPackageWithAssets) continue;

    const { packageInfo } = installedPackageWithAssets;
    const logger = appContextService.getLogger();
    const updatedIndexTemplates: IndexTemplateEntry[] = [];

    for (const dataStream of packageInfo.data_streams ?? []) {
      const templateName = getRegistryDataStreamAssetBaseName(dataStream);

      let rawTemplate;
      try {
        const res = await esClient.indices.getIndexTemplate({ name: templateName });
        rawTemplate = res.index_templates[0]?.index_template;
      } catch {
        logger.debug(
          `[handleNamespaceTemplateDelete] index template ${templateName} not found, skipping`
        );
        continue;
      }
      if (!rawTemplate) continue;

      const {
        created_date: _cd,
        created_date_millis: _cdm,
        modified_date: _md,
        modified_date_millis: _mdm,
        ...indexTemplate
      } = rawTemplate as IndexTemplate;

      const updatedComposedOf = (indexTemplate.composed_of ?? []).filter(
        (t) => t !== `${namespace}@custom`
      );

      if (updatedComposedOf.length === indexTemplate.composed_of?.length) continue;

      const ignoreMissing = updatedComposedOf.filter(isUserSettingsTemplate);

      const updatedTemplate: IndexTemplate = {
        ...indexTemplate,
        composed_of: updatedComposedOf,
        ignore_missing_component_templates: ignoreMissing,
      };

      await esClient.indices.putIndexTemplate({ name: templateName, ...updatedTemplate });

      updatedIndexTemplates.push({ templateName, indexTemplate: updatedTemplate });
    }

    if (updatedIndexTemplates.length > 0) {
      await updateCurrentWriteIndices(
        esClient,
        appContextService.getLogger(),
        updatedIndexTemplates
      );
    }

    // Remove the namespace ref from the Installation SO
    const freshInstallation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packageName,
    });
    if (freshInstallation) {
      await updateEsAssetReferences(soClient, packageName, freshInstallation.installed_es ?? [], {
        assetsToRemove: [
          { id: `${namespace}@custom`, type: ElasticsearchAssetType.componentTemplate },
        ],
      });
    }
  }
}
