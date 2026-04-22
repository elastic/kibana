/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { escapeKuery } from '@kbn/es-query';
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
import {
  updateCurrentWriteIndices,
  generateNamespaceTemplateName,
  generateNamespaceTemplateIndexPattern,
  getNamespaceTemplatePriority,
  isNamespaceTemplate,
  getNamespaceFromTemplateId,
} from '../epm/elasticsearch/template/template';
import {
  getInstalledPackageWithAssets,
  getInstallation,
  getPackageSavedObjects,
} from '../epm/packages/get';
import { getRegistryDataStreamAssetBaseName } from '../../../common/services';
import { isUserSettingsTemplate } from '../epm/elasticsearch/template/utils';
import { updateEsAssetReferences } from '../epm/packages/es_assets_reference';
import {
  SO_SEARCH_LIMIT,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  MAX_CONCURRENT_COMPONENT_TEMPLATES,
} from '../../constants';
import { isSpaceAwarenessEnabled } from '../spaces/helpers';
import { isNamespaceIndexTemplateEnabled } from '../spaces/space_settings';
import { throwIfAborted } from '../../tasks/utils';

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
      !so.id.endsWith(':prev') &&
      (so.attributes.namespace || 'default') === namespace &&
      !excludePolicyIds.includes(so.id)
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
 *
 * Used when building the `composed_of` for a namespace-scoped index template.
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
 * Fetches a base index template from ES and strips read-only date properties.
 * Returns the cleaned template or undefined if not found.
 */
async function fetchBaseTemplate(
  esClient: ElasticsearchClient,
  templateName: string,
  logContext: string,
  abortController?: AbortController
): Promise<IndexTemplate | undefined> {
  const logger = appContextService.getLogger();
  let rawTemplate;
  try {
    const res = await esClient.indices.getIndexTemplate(
      { name: templateName },
      { signal: abortController?.signal }
    );
    rawTemplate = res.index_templates[0]?.index_template;
  } catch (err: unknown) {
    if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode !== 404) {
      throw err;
    }
    logger.debug(`[${logContext}] index template ${templateName} not found, skipping`);
    return undefined;
  }

  if (!rawTemplate) {
    return undefined;
  }

  // Strip system-managed date properties that cannot be set on PUT
  const {
    created_date: _cd,
    created_date_millis: _cdm,
    modified_date: _md,
    modified_date_millis: _mdm,
    ...indexTemplate
  } = rawTemplate as IndexTemplate;

  return indexTemplate;
}

/**
 * Builds a namespace-scoped index template from a base template.
 * The namespace template has a more specific index pattern, higher priority,
 * and includes `<namespace>@custom` in its `composed_of`.
 */
function buildNamespaceTemplate({
  baseTemplate,
  dataStream,
  namespace,
  templateName,
}: {
  baseTemplate: IndexTemplate;
  dataStream: RegistryDataStream;
  namespace: string;
  templateName: string;
}): { name: string; template: IndexTemplate } {
  const nsTemplateName = generateNamespaceTemplateName(templateName, namespace);
  const nsIndexPattern = generateNamespaceTemplateIndexPattern(dataStream, namespace);
  const nsPriority = getNamespaceTemplatePriority(dataStream);

  const composedOf = insertNamespaceCustomTemplate(
    [...(baseTemplate.composed_of ?? [])],
    namespace,
    templateName
  );

  const ignoreMissing = composedOf.filter(isUserSettingsTemplate);

  const nsTemplate: IndexTemplate = {
    ...baseTemplate,
    index_patterns: [nsIndexPattern],
    priority: nsPriority,
    composed_of: composedOf,
    ignore_missing_component_templates: ignoreMissing,
  };

  return { name: nsTemplateName, template: nsTemplate };
}

/**
 * When a package policy is created or its namespace changes, create (or update) a
 * namespace-scoped index template for each of the package's data streams if the new
 * namespace is opted in via space settings.
 *
 * This function only handles creation of the new namespace template. Deletion of the
 * old namespace template (on a namespace change) is deferred to
 * `handleOldNamespaceTemplateCleanup`, which must be called AFTER the policy saved
 * object has been successfully committed. Splitting the operations this way avoids
 * permanently losing the old template if the SO save fails.
 */
export async function handleNamespaceTemplateUpdate({
  soClient,
  esClient,
  packagePolicy,
  oldPackagePolicy,
  spaceId,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicy: PackagePolicy | NewPackagePolicy;
  oldPackagePolicy?: PackagePolicy;
  spaceId?: string;
}) {
  if (!packagePolicy.package?.name) {
    return;
  }

  const newNamespace = packagePolicy.namespace || 'default';
  const oldNamespace =
    oldPackagePolicy !== undefined ? oldPackagePolicy.namespace || 'default' : undefined;

  // No-op if namespace hasn't changed
  if (oldNamespace !== undefined && oldNamespace === newNamespace) {
    return;
  }

  // Only proceed if the new namespace is opted in for namespace-scoped templates
  const newNamespaceEnabled = await isNamespaceIndexTemplateEnabled(newNamespace, spaceId);
  if (!newNamespaceEnabled) {
    return;
  }

  const installedPackageWithAssets = await getInstalledPackageWithAssets({
    savedObjectsClient: soClient,
    pkgName: packagePolicy.package.name,
  });

  if (!installedPackageWithAssets) {
    appContextService
      .getLogger()
      .debug(
        `[handleNamespaceTemplateUpdate] Package ${packagePolicy.package.name} installation not found, skipping namespace template update`
      );
    return;
  }

  const { packageInfo } = installedPackageWithAssets;
  const dataStreams = packageInfo.data_streams ?? [];

  if (dataStreams.length === 0) {
    return;
  }

  const logger = appContextService.getLogger();
  const updatedIndexTemplates: IndexTemplateEntry[] = [];

  await pMap(
    dataStreams,
    async (dataStream) => {
      const templateName = getRegistryDataStreamAssetBaseName(dataStream);
      const baseTemplate = await fetchBaseTemplate(
        esClient,
        templateName,
        'handleNamespaceTemplateUpdate'
      );
      if (!baseTemplate) return;

      const { name: nsName, template: nsTemplate } = buildNamespaceTemplate({
        baseTemplate,
        dataStream,
        namespace: newNamespace,
        templateName,
      });

      await esClient.indices.putIndexTemplate({ name: nsName, ...nsTemplate });
      updatedIndexTemplates.push({ templateName: nsName, indexTemplate: nsTemplate });
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  if (updatedIndexTemplates.length > 0) {
    await updateCurrentWriteIndices(esClient, logger, updatedIndexTemplates);
  }

  if (updatedIndexTemplates.length > 0) {
    // Track the newly created index templates in the Installation SO.
    // Note: ${namespace}@custom component templates are user-created and intentionally
    // not tracked in installed_es to avoid showing them as Fleet-managed assets.
    const freshInstallation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package.name,
    });
    const assetsToAdd = updatedIndexTemplates.map(({ templateName }) => ({
      id: templateName,
      type: ElasticsearchAssetType.indexTemplate,
    }));
    await updateEsAssetReferences(
      soClient,
      packagePolicy.package.name,
      freshInstallation?.installed_es ?? [],
      { assetsToAdd }
    );
  }
}

/**
 * Removes the namespace-scoped index templates for `oldNamespace` after a policy's
 * namespace has changed and its saved object has been successfully committed.
 *
 * Because the SO is already saved with the new namespace by the time this runs,
 * `isNamespaceSafeToRemove` will naturally exclude the updated policy from its count.
 * Must be called AFTER the package policy SO save.
 */
export async function handleOldNamespaceTemplateCleanup({
  soClient,
  esClient,
  packageName,
  oldNamespace,
  spaceId,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packageName: string;
  oldNamespace: string;
  spaceId?: string;
}) {
  const namespaceEnabled = await isNamespaceIndexTemplateEnabled(oldNamespace, spaceId);
  if (!namespaceEnabled) return;

  // No excludePolicyIds needed: the policy SO is already saved with the new namespace,
  // so the updated policy is no longer counted as using oldNamespace.
  const safeToRemove = await isNamespaceSafeToRemove(soClient, packageName, oldNamespace, []);
  if (!safeToRemove) return;

  const installedPkg = await getInstalledPackageWithAssets({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  if (!installedPkg) return;

  const { packageInfo } = installedPkg;
  const dataStreams = packageInfo.data_streams ?? [];
  if (dataStreams.length === 0) return;

  const logger = appContextService.getLogger();

  await pMap(
    dataStreams,
    async (dataStream) => {
      const templateName = getRegistryDataStreamAssetBaseName(dataStream);
      const nsName = generateNamespaceTemplateName(templateName, oldNamespace);
      try {
        await esClient.indices.deleteIndexTemplate({ name: nsName }, { ignore: [404] });
      } catch (err: unknown) {
        logger.warn(
          `[handleOldNamespaceTemplateCleanup] Failed to delete namespace template ${nsName}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  const freshInstallation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  if (!freshInstallation) return;

  const assetsToRemove: Array<{ id: string; type: ElasticsearchAssetType }> = [
    ...dataStreams.map((dataStream) => ({
      id: generateNamespaceTemplateName(
        getRegistryDataStreamAssetBaseName(dataStream),
        oldNamespace
      ),
      type: ElasticsearchAssetType.indexTemplate as ElasticsearchAssetType,
    })),
    // Include backward-compat removal of any previously tracked ${oldNamespace}@custom ref
    { id: `${oldNamespace}@custom`, type: ElasticsearchAssetType.componentTemplate },
  ];

  await updateEsAssetReferences(soClient, packageName, freshInstallation.installed_es ?? [], {
    assetsToRemove,
  });
}

/**
 * After a package is (re)installed, rebuild any namespace-scoped index templates for
 * opted-in namespaces that have active package policies. Called from the state machine's
 * final step so namespace templates survive reinstalls/upgrades.
 *
 * On first install there are no policies yet, so this is a no-op.
 */
export async function handleNamespaceTemplateRestoreAfterPackageInstall({
  soClient,
  esClient,
  packageName,
  dataStreams,
  spaceId,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packageName: string;
  dataStreams: RegistryDataStream[];
  spaceId?: string;
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

  const allNamespaces = [
    ...new Set(result.saved_objects.map((so) => so.attributes.namespace || 'default')),
  ];

  if (allNamespaces.length === 0) {
    return;
  }

  // Filter to only opted-in namespaces
  const enabledChecks = await Promise.all(
    allNamespaces.map(async (ns) => ({
      namespace: ns,
      enabled: await isNamespaceIndexTemplateEnabled(ns, spaceId),
    }))
  );
  const uniqueNamespaces = enabledChecks
    .filter(({ enabled }) => enabled)
    .map(({ namespace }) => namespace);

  if (uniqueNamespaces.length === 0) {
    return;
  }

  const logger = appContextService.getLogger();
  const updatedIndexTemplates: IndexTemplateEntry[] = [];

  await pMap(
    dataStreams,
    async (dataStream) => {
      const templateName = getRegistryDataStreamAssetBaseName(dataStream);
      const baseTemplate = await fetchBaseTemplate(
        esClient,
        templateName,
        'handleNamespaceTemplateRestoreAfterPackageInstall'
      );
      if (!baseTemplate) {
        return;
      }

      for (const namespace of uniqueNamespaces) {
        const { name: nsName, template: nsTemplate } = buildNamespaceTemplate({
          baseTemplate,
          dataStream,
          namespace,
          templateName,
        });

        await esClient.indices.putIndexTemplate({ name: nsName, ...nsTemplate });
        updatedIndexTemplates.push({ templateName: nsName, indexTemplate: nsTemplate });
      }
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  if (updatedIndexTemplates.length === 0) {
    return;
  }

  await updateCurrentWriteIndices(esClient, logger, updatedIndexTemplates);

  // Re-track all namespace refs in the Installation SO
  const freshInstallation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  const currentEsRefs = freshInstallation?.installed_es ?? [];

  const assetsToAdd: Array<{ id: string; type: ElasticsearchAssetType }> = [];
  for (const namespace of uniqueNamespaces) {
    for (const dataStream of dataStreams) {
      const templateName = getRegistryDataStreamAssetBaseName(dataStream);
      assetsToAdd.push({
        id: generateNamespaceTemplateName(templateName, namespace),
        type: ElasticsearchAssetType.indexTemplate,
      });
    }
  }

  await updateEsAssetReferences(soClient, packageName, currentEsRefs, { assetsToAdd });

  // Clean up stale namespace templates for namespaces that are no longer opted in.
  // This handles the case where a namespace was opted out while a package was being reinstalled.
  const staleRefs = currentEsRefs.filter(
    (ref) =>
      ref.type === ElasticsearchAssetType.indexTemplate &&
      isNamespaceTemplate(ref.id) &&
      !uniqueNamespaces.includes(getNamespaceFromTemplateId(ref.id) ?? '')
  );

  if (staleRefs.length > 0) {
    await pMap(
      staleRefs,
      async (ref) => {
        try {
          await esClient.indices.deleteIndexTemplate({ name: ref.id }, { ignore: [404] });
        } catch (err: unknown) {
          logger.warn(
            `[handleNamespaceTemplateRestoreAfterPackageInstall] Failed to delete stale namespace template ${
              ref.id
            }: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      },
      { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
    );

    // Also clean up stale @custom component template refs
    const staleNamespaces = [
      ...new Set(staleRefs.map((ref) => getNamespaceFromTemplateId(ref.id)).filter(Boolean)),
    ] as string[];
    const staleAssetsToRemove = [
      ...staleRefs.map((ref) => ({ id: ref.id, type: ElasticsearchAssetType.indexTemplate })),
      ...staleNamespaces.map((ns) => ({
        id: `${ns}@custom`,
        type: ElasticsearchAssetType.componentTemplate,
      })),
    ];

    // Re-fetch installation since we just wrote to it above
    const postWriteInstallation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packageName,
    });
    await updateEsAssetReferences(
      soClient,
      packageName,
      postWriteInstallation?.installed_es ?? [],
      { assetsToRemove: staleAssetsToRemove }
    );
  }
}

/**
 * When package policies are deleted, remove namespace-scoped index templates for
 * namespaces that are no longer used by any remaining policy for that package.
 *
 * Must be called BEFORE the saved objects are deleted so that the query to check remaining
 * policies can still exclude the being-deleted IDs correctly.
 */
export async function handleNamespaceTemplateDelete({
  soClient,
  esClient,
  packagePolicies,
  spaceId,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicies: PackagePolicy[];
  spaceId?: string;
}) {
  // Build a de-duplicated list of (packageName, namespace) pairs to process
  const seen = new Set<string>();
  const toProcess: Array<{ packageName: string; namespace: string; policyIds: string[] }> = [];

  for (const policy of packagePolicies) {
    if (!policy.package?.name) continue;
    const namespace = policy.namespace || 'default';
    const key = `${policy.package.name}::${namespace}`;
    if (seen.has(key)) {
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

  // Cache package info per package name
  type InstalledPackageResult = NonNullable<
    Awaited<ReturnType<typeof getInstalledPackageWithAssets>>
  >;
  const packageInfoCache = new Map<string, InstalledPackageResult | null>();

  for (const { packageName, namespace, policyIds } of toProcess) {
    // Only process opted-in namespaces
    const namespaceEnabled = await isNamespaceIndexTemplateEnabled(namespace, spaceId);
    if (!namespaceEnabled) continue;

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

    // Delete namespace index templates
    await pMap(
      packageInfo.data_streams ?? [],
      async (dataStream) => {
        const templateName = getRegistryDataStreamAssetBaseName(dataStream);
        const nsName = generateNamespaceTemplateName(templateName, namespace);

        try {
          await esClient.indices.deleteIndexTemplate({ name: nsName }, { ignore: [404] });
        } catch (err: unknown) {
          logger.warn(
            `[handleNamespaceTemplateDelete] Failed to delete namespace template ${nsName}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      },
      { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
    );

    // Remove refs from the Installation SO
    const freshInstallation = await getInstallation({
      savedObjectsClient: soClient,
      pkgName: packageName,
    });
    if (freshInstallation) {
      const assetsToRemove: Array<{ id: string; type: ElasticsearchAssetType }> = [];
      for (const dataStream of packageInfo.data_streams ?? []) {
        const templateName = getRegistryDataStreamAssetBaseName(dataStream);
        assetsToRemove.push({
          id: generateNamespaceTemplateName(templateName, namespace),
          type: ElasticsearchAssetType.indexTemplate,
        });
      }
      assetsToRemove.push({
        id: `${namespace}@custom`,
        type: ElasticsearchAssetType.componentTemplate,
      });

      await updateEsAssetReferences(soClient, packageName, freshInstallation.installed_es ?? [], {
        assetsToRemove,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// syncNamespaceTemplates — bulk create/remove triggered by settings change
// ---------------------------------------------------------------------------

export interface SyncNamespaceTemplatesSummary {
  created: Record<string, string[]>; // namespace → package names
  removed: Record<string, string[]>; // namespace → package names
}

/**
 * Handles the side effects of a change to the `namespace_index_templates_enabled_for`
 * list in space settings. Creates namespace templates for added namespaces and deletes
 * them for removed namespaces across all affected integration packages.
 *
 * Called from the `fleet:sync_namespace_templates` task when the opt-in list changes.
 */
export async function syncNamespaceTemplates({
  soClient,
  esClient,
  addedNamespaces,
  removedNamespaces,
  abortController,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  addedNamespaces: string[];
  removedNamespaces: string[];
  abortController?: AbortController;
}): Promise<SyncNamespaceTemplatesSummary> {
  const logger = appContextService.getLogger();
  const summary: SyncNamespaceTemplatesSummary = { created: {}, removed: {} };

  // --- Handle added namespaces: create templates for existing integrations ---
  if (addedNamespaces.length > 0) {
    const savedObjectType = await getPackagePolicySavedObjectType();

    for (const namespace of addedNamespaces) {
      if (abortController) throwIfAborted(abortController);
      // Query only policies for this namespace rather than fetching all policies and filtering
      // in JS, to avoid scanning every policy in large deployments.
      // For 'default' we must also match policies where the namespace attribute is absent,
      // because those are treated as 'default' throughout the codebase.
      const escapedNamespace = escapeKuery(namespace);
      const namespaceFilter =
        namespace === 'default'
          ? `(${savedObjectType}.attributes.namespace:${escapedNamespace} OR NOT ${savedObjectType}.attributes.namespace:*)`
          : `${savedObjectType}.attributes.namespace:${escapedNamespace}`;
      const policiesForNamespace = await soClient.find<PackagePolicySOAttributes>({
        type: savedObjectType,
        filter: namespaceFilter,
        perPage: SO_SEARCH_LIMIT,
        namespaces: ['*'],
      });

      const uniquePackageNames = [
        ...new Set(
          policiesForNamespace.saved_objects
            .filter((so) => so.attributes.package?.name)
            .map((so) => so.attributes.package!.name)
        ),
      ];

      if (uniquePackageNames.length === 0) continue;

      const affectedPackages: string[] = [];

      for (const packageName of uniquePackageNames) {
        const installedPkg = await getInstalledPackageWithAssets({
          savedObjectsClient: soClient,
          pkgName: packageName,
        });
        if (!installedPkg) continue;

        const { packageInfo } = installedPkg;
        const dataStreams = packageInfo.data_streams ?? [];
        if (dataStreams.length === 0) continue;

        const updatedIndexTemplates: IndexTemplateEntry[] = [];

        await pMap(
          dataStreams,
          async (dataStream) => {
            if (abortController) throwIfAborted(abortController);
            const templateName = getRegistryDataStreamAssetBaseName(dataStream);
            const baseTemplate = await fetchBaseTemplate(
              esClient,
              templateName,
              'syncNamespaceTemplates',
              abortController
            );
            if (!baseTemplate) return;

            const { name: nsName, template: nsTemplate } = buildNamespaceTemplate({
              baseTemplate,
              dataStream,
              namespace,
              templateName,
            });

            await esClient.indices.putIndexTemplate(
              { name: nsName, ...nsTemplate },
              { signal: abortController?.signal }
            );
            updatedIndexTemplates.push({ templateName: nsName, indexTemplate: nsTemplate });
          },
          { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
        );

        if (updatedIndexTemplates.length > 0) {
          await updateCurrentWriteIndices(esClient, logger, updatedIndexTemplates);

          // Track refs in installed_es
          const freshInstallation = await getInstallation({
            savedObjectsClient: soClient,
            pkgName: packageName,
          });
          const assetsToAdd: Array<{ id: string; type: ElasticsearchAssetType }> =
            updatedIndexTemplates.map((t) => ({
              id: t.templateName,
              type: ElasticsearchAssetType.indexTemplate,
            }));

          await updateEsAssetReferences(
            soClient,
            packageName,
            freshInstallation?.installed_es ?? [],
            { assetsToAdd }
          );

          affectedPackages.push(packageName);
        }
      }

      if (affectedPackages.length > 0) {
        summary.created[namespace] = affectedPackages;
      }
    }
  }

  // --- Handle removed namespaces: delete templates across all packages ---
  if (removedNamespaces.length > 0) {
    const allPackages = await getPackageSavedObjects(soClient);

    for (const namespace of removedNamespaces) {
      if (abortController) throwIfAborted(abortController);
      const affectedPackages: string[] = [];

      for (const pkgSO of allPackages.saved_objects) {
        const packageName = pkgSO.attributes.name;
        const installedEs = pkgSO.attributes.installed_es ?? [];

        // Check if this package has any namespace templates for the removed namespace
        const nsTemplateRefs = installedEs.filter(
          (ref) =>
            ref.type === ElasticsearchAssetType.indexTemplate &&
            isNamespaceTemplate(ref.id) &&
            getNamespaceFromTemplateId(ref.id) === namespace
        );

        if (nsTemplateRefs.length === 0) continue;

        // Delete the templates from ES
        await pMap(
          nsTemplateRefs,
          async (ref) => {
            if (abortController) throwIfAborted(abortController);
            try {
              await esClient.indices.deleteIndexTemplate(
                { name: ref.id },
                { ignore: [404], signal: abortController?.signal }
              );
            } catch (err: unknown) {
              logger.warn(
                `[syncNamespaceTemplates] Failed to delete namespace template ${ref.id}: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            }
          },
          { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
        );

        // Remove refs from installed_es — re-fetch to avoid stale data when
        // multiple namespaces affect the same package in successive iterations.
        const freshInstallation = await getInstallation({
          savedObjectsClient: soClient,
          pkgName: packageName,
        });
        const assetsToRemove = [
          ...nsTemplateRefs.map((ref) => ({
            id: ref.id,
            type: ElasticsearchAssetType.indexTemplate,
          })),
          { id: `${namespace}@custom`, type: ElasticsearchAssetType.componentTemplate },
        ];

        await updateEsAssetReferences(
          soClient,
          packageName,
          freshInstallation?.installed_es ?? [],
          { assetsToRemove }
        );

        affectedPackages.push(packageName);
      }

      if (affectedPackages.length > 0) {
        summary.removed[namespace] = affectedPackages;
      }
    }
  }

  return summary;
}
