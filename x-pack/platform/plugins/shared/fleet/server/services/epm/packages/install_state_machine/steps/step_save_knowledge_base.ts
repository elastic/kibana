/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { FleetError } from '../../../../../errors';
import {
  saveKnowledgeBaseContentToIndex,
  deletePackageKnowledgeBase,
} from '../../knowledge_base_index';
import type { InstallContext } from '../_state_machine_package_install';
import { INSTALL_STATES } from '../../../../../../common/types';
import { withPackageSpan } from '../../utils';
import {
  ElasticsearchAssetType,
  type ArchiveIterator,
  type ArchiveEntry,
} from '../../../../../../common/types/models/epm';
import { updateEsAssetReferences } from '../../es_assets_reference';
import type { KnowledgeBaseItem } from '../../../../../../common/types/models/epm';
import { licenseService } from '../../../../license';
import { appContextService } from '../../../../app_context';
export const KNOWLEDGE_BASE_PATH = 'docs/knowledge_base/';

/**
 * Extract knowledge base files directly from the package archive
 */
async function extractKnowledgeBaseFromArchive(
  archiveIterator: ArchiveIterator,
  pkgName: string,
  pkgVersion: string
): Promise<KnowledgeBaseItem[]> {
  const knowledgeBaseItems: KnowledgeBaseItem[] = [];

  await archiveIterator.traverseEntries(
    async (entry: ArchiveEntry) => {
      if (entry.buffer) {
        const content = entry.buffer.toString('utf8');
        const knowledgeBaseIndex = entry.path.indexOf(KNOWLEDGE_BASE_PATH);
        // remove the leading path (docs/knowledge_base/) so we aren't storing it in the field in ES
        const fileName =
          knowledgeBaseIndex >= 0
            ? entry.path.substring(knowledgeBaseIndex + KNOWLEDGE_BASE_PATH.length)
            : path.basename(entry.path);

        knowledgeBaseItems.push({
          fileName,
          content,
        });
      }
    },
    (entryPath: string) => entryPath.includes(KNOWLEDGE_BASE_PATH) && entryPath.endsWith('.md')
  );

  return knowledgeBaseItems;
}

export async function stepSaveKnowledgeBase(context: InstallContext): Promise<void> {
  const { packageInstallContext, esClient, savedObjectsClient, logger } = context;
  const { packageInfo, archiveIterator } = packageInstallContext;

  let esReferences = context.esReferences ?? [];

  logger.debug(
    `Knowledge base step: Starting for package ${packageInfo.name}@${packageInfo.version}`
  );

  // Check if knowledge base installation is enabled via experimental feature flag
  const experimentalFeatures = appContextService.getExperimentalFeatures();
  if (!experimentalFeatures.installIntegrationsKnowledge) {
    logger.debug(
      `Knowledge base step: Skipping knowledge base save - installIntegrationsKnowledge experimental feature is disabled`
    );
    return;
  }

  // Check if user has appropriate license for knowledge base functionality
  // You can adjust the license requirement as needed (e.g., isGoldPlus(), isPlatinum(), isEnterprise())
  if (!licenseService.isEnterprise()) {
    logger.debug(`Knowledge base step: Skipping knowledge base save - requires Enterprise license`);
    return;
  }

  // Extract knowledge base content directly from the archive
  const knowledgeBaseItems = await extractKnowledgeBaseFromArchive(
    archiveIterator,
    packageInfo.name,
    packageInfo.version
  );

  logger.debug(`Knowledge base step: Found ${knowledgeBaseItems.length} items to process`);

  // Save knowledge base content if present
  if (knowledgeBaseItems && knowledgeBaseItems.length > 0) {
    try {
      // Save knowledge base content - this handles both fresh installs and upgrades
      // by always deleting existing content for the package before saving new content
      const documentIds = await saveKnowledgeBaseContentToIndex({
        esClient,
        pkgName: packageInfo.name,
        pkgVersion: packageInfo.version,
        knowledgeBaseContent: knowledgeBaseItems,
      });

      logger.debug(`Knowledge base step: Saved ${documentIds.length} documents to index`);

      // Add knowledge base asset references using the ES-generated document IDs
      const knowledgeBaseAssetRefs = documentIds.map((docId) => ({
        id: docId,
        type: ElasticsearchAssetType.knowledgeBase,
      }));

      // Update ES asset references to include knowledge base assets
      esReferences = await updateEsAssetReferences(
        savedObjectsClient,
        packageInfo.name,
        esReferences,
        {
          assetsToAdd: knowledgeBaseAssetRefs,
        }
      );
    } catch (error) {
      throw new FleetError(`Error saving knowledge base content: ${error}`);
    }
  }
  // Update context with the new esReferences
  context.esReferences = esReferences;
}

export async function cleanupKnowledgeBaseStep(context: InstallContext) {
  const { logger, esClient, installedPkg, retryFromLastState, force, initialState } = context;

  // Clean up knowledge base content during retry or rollback
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.SAVE_KNOWLEDGE_BASE &&
    esClient &&
    installedPkg?.attributes?.name
  ) {
    logger.debug('Retry transition - clean up package knowledge base content');
    await withPackageSpan(
      'Retry transition - clean up package knowledge base content',
      async () => {
        await deletePackageKnowledgeBase(esClient, installedPkg.attributes.name);
      }
    );
  }
}
