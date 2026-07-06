/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { appContextService } from '../../app_context';
import { MAX_CONCURRENT_COMPONENT_TEMPLATES } from '../../../constants';

import { getInstalledPackageWithAssets, getInstallation } from './get';
import { syncSetIlmPolicy, syncClearIlmPolicy } from './namespace_ilm_component_templates';

export { insertIlmComponentTemplate } from './namespace_ilm_component_templates';

export interface SyncIlmPolicySummary {
  packageName: string;
  namespace: string;
  updatedTemplates: string[];
  removedTemplates: string[];
  skipped: boolean;
}

/**
 * Creates or removes Fleet-managed ILM component templates for a single
 * `(package, namespace)` pair and patches each namespace index template's
 * `composed_of` accordingly. Called from the `fleet:sync_ilm_policy` task.
 *
 * When `ilmPolicy` is a non-empty string the component templates are created or
 * updated.  When it is `undefined` or an empty string the component templates are
 * deleted and the references are removed from the namespace index templates.
 */
export async function syncIlmPolicy({
  soClient,
  esClient,
  packageName,
  namespace,
  ilmPolicy,
  abortController,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packageName: string;
  namespace: string;
  ilmPolicy: string | undefined;
  abortController?: AbortController;
}): Promise<SyncIlmPolicySummary> {
  const logger = appContextService.getLogger();
  const summary: SyncIlmPolicySummary = {
    packageName,
    namespace,
    updatedTemplates: [],
    removedTemplates: [],
    skipped: false,
  };

  const installedPkg = await getInstalledPackageWithAssets({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  if (!installedPkg) {
    logger.debug(`[syncIlmPolicy] Package ${packageName} not installed, skipping`);
    summary.skipped = true;
    return summary;
  }

  const { packageInfo } = installedPkg;
  const dataStreams = packageInfo.data_streams ?? [];
  if (dataStreams.length === 0) {
    return summary;
  }

  const clearing = !ilmPolicy;

  if (clearing) {
    await syncClearIlmPolicy({
      soClient,
      esClient,
      packageName,
      packageInfo,
      dataStreams,
      namespace,
      summary,
      abortController,
    });
  } else {
    await syncSetIlmPolicy({
      soClient,
      esClient,
      packageName,
      packageInfo,
      dataStreams,
      namespace,
      ilmPolicy,
      summary,
      abortController,
    });
  }

  return summary;
}

/**
 * After a package is (re)installed, re-create ILM component templates for each
 * namespace that has an `ilm_policy` set in `Installation.namespace_customization_settings`.
 * Called alongside `handleNamespaceTemplateRestoreAfterPackageInstall` so ILM settings
 * survive reinstalls and upgrades.
 */
export async function handleIlmSettingsRestoreAfterPackageInstall({
  soClient,
  esClient,
  packageName,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packageName: string;
}) {
  const installation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  const settings = installation?.namespace_customization_settings ?? {};
  const namespacesWithIlm = Object.entries(settings).filter(([, s]) => !!s.ilm_policy);
  if (namespacesWithIlm.length === 0) {
    return;
  }

  // Restore each namespace's ILM policy with bounded concurrency so packages with many
  // configured namespaces don't serialize install/upgrade time.
  await pMap(
    namespacesWithIlm,
    ([namespace, { ilm_policy: ilmPolicy }]) =>
      syncIlmPolicy({
        soClient,
        esClient,
        packageName,
        namespace,
        ilmPolicy,
      }),
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );
}
