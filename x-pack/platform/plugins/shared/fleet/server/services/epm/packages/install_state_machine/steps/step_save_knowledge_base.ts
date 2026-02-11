/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import type { Logger } from '@kbn/core/server';

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

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
import type { EsAssetReference } from '../../../../../types';
import { updateEsAssetReferences } from '../../es_assets_reference';
import type { KnowledgeBaseItem } from '../../../../../../common/types/models/epm';
import { licenseService } from '../../../../license';
import { getIntegrationKnowledgeSetting } from '../../get_integration_knowledge_setting';
export const KNOWLEDGE_BASE_PATH = 'docs/knowledge_base/';
export const DOCS_PATH_PATTERN = '/docs/';
export const KNOWLEDGE_BASE_FOLDER = 'knowledge_base/';

/**
 * Extract knowledge base files directly from the package archive
 * This includes all .md files from the docs/ folder (including docs/knowledge_base/)
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

        // Determine the filename based on the path
        let fileName: string;
        const docsIndex = entry.path.indexOf(DOCS_PATH_PATTERN);

        if (docsIndex >= 0) {
          // Extract path relative to docs/ folder
          const pathAfterDocs = entry.path.substring(docsIndex + DOCS_PATH_PATTERN.length);

          // If it's in knowledge_base subfolder, remove that prefix too for backward compatibility
          if (pathAfterDocs.startsWith(KNOWLEDGE_BASE_FOLDER)) {
            fileName = pathAfterDocs.substring(KNOWLEDGE_BASE_FOLDER.length);
          } else {
            fileName = pathAfterDocs;
          }
        } else {
          // Fallback to basename
          fileName = path.basename(entry.path);
        }

        knowledgeBaseItems.push({
          fileName,
          content,
        });
      }
    },
    (entryPath: string) => entryPath.includes(DOCS_PATH_PATTERN) && entryPath.endsWith('.md')
  );

  return knowledgeBaseItems;
}

export async function stepSaveKnowledgeBase(
  context: InstallContext
): Promise<{ esReferences: EsAssetReference[] }> {
  const { packageInstallContext, esClient, savedObjectsClient, logger } = context;
  const { packageInfo, archiveIterator } = packageInstallContext;

  const esReferences = context.esReferences ?? [];

  logger.debug(
    `Knowledge base step: Starting for package ${packageInfo.name}@${packageInfo.version}`
  );

  const integrationKnowledgeEnabled = await getIntegrationKnowledgeSetting(savedObjectsClient);

  // Check if knowledge base installation is enabled via user setting
  if (!integrationKnowledgeEnabled) {
    logger.debug(
      `Knowledge base step: Skipping knowledge base save - integration knowledge enabled setting is disabled`
    );
    return { esReferences };
  }

  // Check if user has appropriate license for knowledge base functionality
  // You can adjust the license requirement as needed (e.g., isGoldPlus(), isPlatinum(), isEnterprise())
  if (!licenseService.isEnterprise()) {
    logger.debug(`Knowledge base step: Skipping knowledge base save - requires Enterprise license`);
    return { esReferences };
  }

  return await indexKnowledgeBase(
    esReferences,
    savedObjectsClient,
    esClient,
    logger,
    packageInfo,
    archiveIterator
  );
}

export async function indexKnowledgeBase(
  esReferences: EsAssetReference[],
  savedObjectsClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  logger: Logger,
  packageInfo: { name: string; version: string },
  archiveIterator: ArchiveIterator,
  abortController?: AbortController
): Promise<{ esReferences: EsAssetReference[] }> {
  // Extract knowledge base content directly from the archive
  const knowledgeBaseItems = await extractKnowledgeBaseFromArchive(
    archiveIterator,
    packageInfo.name,
    packageInfo.version
  );

  logger.debug(
    `Knowledge base step: Found ${knowledgeBaseItems.length} items to process for package ${packageInfo.name}@${packageInfo.version}`
  );

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
        abortController,
      });

      logger.debug(
        `Knowledge base step: Saved ${documentIds.length} documents to index for package ${packageInfo.name}@${packageInfo.version}`
      );

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

  return { esReferences };
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
