/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { IndexTemplate, IndexTemplateEntry, RegistryDataStream } from '../../../types';
import { ElasticsearchAssetType } from '../../../../common/types';
import { appContextService } from '../../app_context';
import {
  updateCurrentWriteIndices,
  generateNamespaceTemplateName,
} from '../elasticsearch/template/template';
import { deleteComponentTemplates } from '../elasticsearch/template/remove';
import { getESAssetMetadata } from '../elasticsearch/meta';
import { retryTransientEsErrors } from '../elasticsearch/retry';
import { getRegistryDataStreamAssetBaseName } from '../../../../common/services';
import { MAX_CONCURRENT_COMPONENT_TEMPLATES } from '../../../constants';
import { throwIfAborted } from '../../../tasks/utils';
import type { PackageInfo } from '../../../../common/types';

import { updateEsAssetReferences } from './es_assets_reference';
import { getInstallation } from './get';
import { isOtelDataStream, fetchIndexTemplate } from './namespace_template_utils';
import type { SyncIlmPolicySummary } from './namespace_ilm_settings';

/**
 * PUTs `nsIndexTemplate` back to ES with `composed_of` replaced by `patchedComposedOf`.
 * Shared by `syncSetIlmPolicy` and `syncClearIlmPolicy`, which only differ in how the
 * `composed_of` array is computed (inserting vs. removing the ILM component template).
 */
async function persistPatchedComposedOf({
  esClient,
  nsTemplateName,
  nsIndexTemplate,
  patchedComposedOf,
  abortController,
}: {
  esClient: ElasticsearchClient;
  nsTemplateName: string;
  nsIndexTemplate: IndexTemplate;
  patchedComposedOf: string[];
  abortController?: AbortController;
}): Promise<void> {
  const logger = appContextService.getLogger();
  await retryTransientEsErrors(
    () =>
      esClient.indices.putIndexTemplate(
        { name: nsTemplateName, ...nsIndexTemplate, composed_of: patchedComposedOf },
        { signal: abortController?.signal }
      ),
    { logger }
  );
}

/**
 * Inserts `nsTemplateName` (the ILM component template) into `composed_of` after
 * `{namespace}@custom` and before `{templateName}@custom` (dataset-level). If already
 * present the array is returned unchanged.
 */
export function insertIlmComponentTemplate(
  composedOf: string[],
  namespace: string,
  templateName: string,
  nsTemplateName: string
): string[] {
  if (composedOf.includes(nsTemplateName)) {
    return composedOf;
  }

  const namespaceEntry = `${namespace}@custom`;
  const datasetEntry = `${templateName}@custom`;

  const namespaceIdx = composedOf.indexOf(namespaceEntry);
  const datasetIdx = composedOf.indexOf(datasetEntry);

  let insertAt: number;
  if (namespaceIdx !== -1) {
    insertAt = namespaceIdx + 1;
  } else if (datasetIdx !== -1) {
    insertAt = datasetIdx;
  } else {
    insertAt = composedOf.length;
  }

  const result = [...composedOf];
  result.splice(insertAt, 0, nsTemplateName);
  return result;
}

function removeIlmComponentTemplate(composedOf: string[], nsTemplateName: string): string[] {
  return composedOf.filter((t) => t !== nsTemplateName);
}

/**
 * Creates or updates the Fleet-managed ILM component template for each `(dataStream, namespace)`
 * pair and patches the namespace index template's `composed_of` to reference it. Called from
 * `syncIlmPolicy` when `ilmPolicy` is a non-empty string.
 */
export async function syncSetIlmPolicy({
  soClient,
  esClient,
  packageName,
  packageInfo,
  dataStreams,
  namespace,
  ilmPolicy,
  summary,
  abortController,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packageName: string;
  packageInfo: Pick<PackageInfo, 'policy_templates' | 'data_streams'>;
  dataStreams: RegistryDataStream[];
  namespace: string;
  ilmPolicy: string;
  summary: SyncIlmPolicySummary;
  abortController?: AbortController;
}): Promise<void> {
  const logger = appContextService.getLogger();
  const updatedIndexTemplates: IndexTemplateEntry[] = [];
  const createdComponentTemplates: string[] = [];

  await pMap(
    dataStreams,
    async (dataStream) => {
      if (abortController) throwIfAborted(abortController);

      const isOtelInputType = isOtelDataStream(dataStream, packageInfo);
      const templateName = getRegistryDataStreamAssetBaseName(dataStream, isOtelInputType);
      const nsTemplateName = generateNamespaceTemplateName(templateName, namespace);

      // Create or update the ILM component template. Tag it with Fleet metadata so it can be
      // safely identified as Fleet-owned during auditing and cleanup.
      await retryTransientEsErrors(
        () =>
          esClient.cluster.putComponentTemplate(
            {
              name: nsTemplateName,
              _meta: getESAssetMetadata({ packageName }),
              template: {
                settings: {
                  'index.lifecycle.name': ilmPolicy,
                },
              },
            },
            { signal: abortController?.signal }
          ),
        { logger }
      );
      logger.debug(`[syncIlmPolicy] Created/updated ILM component template ${nsTemplateName}`);
      // Track here (before the index-template check) so templates created when the namespace
      // index template is absent are still recorded in installed_es (r3518659890).
      createdComponentTemplates.push(nsTemplateName);

      // Patch the namespace index template's composed_of to reference the component template
      const nsIndexTemplate = await fetchIndexTemplate(
        esClient,
        nsTemplateName,
        'syncIlmPolicy',
        abortController
      );
      if (!nsIndexTemplate) {
        logger.debug(
          `[syncIlmPolicy] Namespace index template ${nsTemplateName} not found, component template created but composed_of not patched`
        );
        return;
      }

      const patchedComposedOf = insertIlmComponentTemplate(
        nsIndexTemplate.composed_of ?? [],
        namespace,
        templateName,
        nsTemplateName
      );
      if (patchedComposedOf !== nsIndexTemplate.composed_of) {
        await persistPatchedComposedOf({
          esClient,
          nsTemplateName,
          nsIndexTemplate,
          patchedComposedOf,
          abortController,
        });
      }

      updatedIndexTemplates.push({
        templateName: nsTemplateName,
        indexTemplate: { ...nsIndexTemplate, composed_of: patchedComposedOf },
      });
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  if (createdComponentTemplates.length === 0) {
    return;
  }

  if (abortController) throwIfAborted(abortController);

  // Track the new component templates in installed_es BEFORE rollover so a rollover
  // failure doesn't prevent tracking (r3518806806). Uses createdComponentTemplates rather
  // than updatedIndexTemplates so templates created when the namespace index template was
  // absent are also recorded (r3518659890).
  const freshInstallation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  const assetsToAdd = createdComponentTemplates.map((id) => ({
    id,
    type: ElasticsearchAssetType.componentTemplate,
  }));
  await updateEsAssetReferences(soClient, packageName, freshInstallation?.installed_es ?? [], {
    assetsToAdd,
  });

  summary.updatedTemplates = updatedIndexTemplates.map(({ templateName }) => templateName);

  // Rollover existing data streams so new backing indices pick up the ILM policy
  if (updatedIndexTemplates.length > 0) {
    try {
      await updateCurrentWriteIndices(esClient, logger, updatedIndexTemplates);
    } catch (err: unknown) {
      if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode !== 404) {
        throw err;
      }
      logger.debug(`[syncIlmPolicy] No existing data streams to roll over for ${packageName}`);
    }
  }
}

/**
 * Deletes the Fleet-managed ILM component template for each `(dataStream, namespace)` pair and
 * removes references to it from the namespace index template's `composed_of`. Called from
 * `syncIlmPolicy` when `ilmPolicy` is `undefined` or an empty string.
 */
export async function syncClearIlmPolicy({
  soClient,
  esClient,
  packageName,
  packageInfo,
  dataStreams,
  namespace,
  summary,
  abortController,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packageName: string;
  packageInfo: Pick<PackageInfo, 'policy_templates' | 'data_streams'>;
  dataStreams: RegistryDataStream[];
  namespace: string;
  summary: SyncIlmPolicySummary;
  abortController?: AbortController;
}): Promise<void> {
  const logger = appContextService.getLogger();
  const deletedTemplateNames: string[] = [];
  const patchedIndexTemplates: IndexTemplateEntry[] = [];

  // Read the installation once up-front: used to check namespace opt-in status (to avoid a race
  // with SyncNamespaceTemplatesTask) and reused for installed_es tracking at the end.
  const currentInstallation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: packageName,
  });
  // When a namespace is being opted out, SyncNamespaceTemplatesTask deletes the whole namespace
  // index template. If we were to patch composed_of here concurrently, we could recreate the
  // template after it was deleted. Skip the PUT when the namespace is no longer opted in.
  const isNamespaceOptedIn = (
    currentInstallation?.namespace_customization_enabled_for ?? []
  ).includes(namespace);

  await pMap(
    dataStreams,
    async (dataStream) => {
      if (abortController) throwIfAborted(abortController);

      const isOtelInputType = isOtelDataStream(dataStream, packageInfo);
      const templateName = getRegistryDataStreamAssetBaseName(dataStream, isOtelInputType);
      const nsTemplateName = generateNamespaceTemplateName(templateName, namespace);

      // Remove the ILM component template name from the namespace index template's composed_of
      const nsIndexTemplate = await fetchIndexTemplate(
        esClient,
        nsTemplateName,
        'syncIlmPolicy',
        abortController
      );
      if (nsIndexTemplate) {
        const patchedComposedOf = removeIlmComponentTemplate(
          nsIndexTemplate.composed_of ?? [],
          nsTemplateName
        );
        if (
          isNamespaceOptedIn &&
          patchedComposedOf.length !== (nsIndexTemplate.composed_of ?? []).length
        ) {
          await persistPatchedComposedOf({
            esClient,
            nsTemplateName,
            nsIndexTemplate,
            patchedComposedOf,
            abortController,
          });
          patchedIndexTemplates.push({
            templateName: nsTemplateName,
            indexTemplate: { ...nsIndexTemplate, composed_of: patchedComposedOf },
          });
        }
      }

      deletedTemplateNames.push(nsTemplateName);
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  if (deletedTemplateNames.length === 0) {
    return;
  }

  // Delete the ILM component templates
  await deleteComponentTemplates(esClient, deletedTemplateNames);

  // Remove the component templates from installed_es tracking BEFORE rollover so a rollover
  // failure doesn't leave deleted templates still tracked in installed_es (r3518806806).
  const assetsToRemove = deletedTemplateNames.map((id) => ({
    id,
    type: ElasticsearchAssetType.componentTemplate,
  }));
  await updateEsAssetReferences(soClient, packageName, currentInstallation?.installed_es ?? [], {
    assetsToRemove,
  });

  summary.removedTemplates = deletedTemplateNames;

  if (abortController) throwIfAborted(abortController);

  // Rollover so the ILM policy no longer applies to new backing indices
  if (patchedIndexTemplates.length > 0) {
    try {
      await updateCurrentWriteIndices(esClient, logger, patchedIndexTemplates);
    } catch (err: unknown) {
      if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode !== 404) {
        throw err;
      }
      logger.debug(`[syncIlmPolicy] No existing data streams to roll over for ${packageName}`);
    }
  }
}
