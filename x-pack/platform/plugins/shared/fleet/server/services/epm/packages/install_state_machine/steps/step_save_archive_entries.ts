/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../../app_context';

import { ASSETS_SAVED_OBJECT_TYPE } from '../../../../../constants';

import {
  assetPathToObjectId,
  removeArchiveEntries,
  saveArchiveEntriesFromAssetsMap,
} from '../../../archive/storage';
import {
  saveKnowledgeBaseContentToIndex,
  deletePackageKnowledgeBase,
  updatePackageKnowledgeBaseVersion,
} from '../../knowledge_base_index';

import type { InstallContext } from '../_state_machine_package_install';
import { INSTALL_STATES } from '../../../../../../common/types';

import { withPackageSpan } from '../../utils';

export async function stepSaveArchiveEntries(
  context: InstallContext
): Promise<{ packageAssetRefs: Array<{ id: string; path: string; type: string }> }> {
  const {
    packageInstallContext,
    savedObjectsClient,
    installSource,
    useStreaming,
    esClient,
    installedPkg,
  } = context;

  await appContextService.getLogger().info(`Installing package from: ${installSource}`);
  await appContextService.getLogger().debug(`Streaming package: ${useStreaming}`);

  const { paths, packageInfo, archiveIterator } = packageInstallContext;

  if (installSource === 'custom') {
    await removeArchiveEntries({
      savedObjectsClient,
      refs: packageInfo?.assets?.map((path) => {
        return {
          type: ASSETS_SAVED_OBJECT_TYPE,
          id: assetPathToObjectId(path),
        };
      }),
    });
  }

  let packageAssetRefs: Array<{ id: string; path: string; type: string }> = [];

  // We would try to optimize it by using streaming here before, but for registry we have streaming kibana assets, not package files
  if (!useStreaming) {
    try {
      // Create an assets map from the archiveIterator
      const assetsMap = new Map<string, Buffer | undefined>();
      await archiveIterator.traverseEntries(
        async (entry) => {
          if (entry.buffer) {
            assetsMap.set(entry.path, entry.buffer);
          }
        },
        () => true
      );

      const result = await saveArchiveEntriesFromAssetsMap({
        savedObjectsClient,
        assetsMap,
        paths,
        packageInfo,
        installSource,
      });

      // Transform the saved objects into package asset references
      packageAssetRefs = result.saved_objects.map((savedObject) => ({
        id: savedObject.id,
        path: savedObject.attributes.asset_path,
        type: ASSETS_SAVED_OBJECT_TYPE,
      }));
    } catch (error) {
      throw new Error(`Error saving archive entries: ${error}`);
    }
  } else {
    // For streaming, we still save package files (icons, readme, changelog, manifest, etc.)
    // but not Kibana assets since those are streamed separately
    try {
      const assetsMap = new Map<string, Buffer | undefined>();
      await archiveIterator.traverseEntries(
        async (entry) => {
          if (entry.buffer) {
            assetsMap.set(entry.path, entry.buffer);
          }
        },
        (path: string) => {
          // Only process non-Kibana assets for streaming
          // Kibana assets are in paths like "package-name/kibana/..."
          return !path.includes('/kibana/');
        }
      );

      const result = await saveArchiveEntriesFromAssetsMap({
        savedObjectsClient,
        assetsMap,
        paths,
        packageInfo,
        installSource,
      });

      // Transform the saved objects into package asset references
      packageAssetRefs = result.saved_objects.map((savedObject) => ({
        id: savedObject.id,
        path: savedObject.attributes.asset_path,
        type: ASSETS_SAVED_OBJECT_TYPE,
      }));
    } catch (error) {
      throw new Error(`Error saving archive entries: ${error}`);
    }
  }
  // First, check that one (or both) of the ai assistants are enabled via api calls
  const { securityAssistantStatus, observabilityAssistantStatus } =
    await appContextService.getO11yAndSecurityAssistantsStatus();
  // Save knowledge base content if present
  if (packageInfo.knowledge_base && packageInfo.knowledge_base.length > 0) {
    try {
      if (securityAssistantStatus || observabilityAssistantStatus) {
        // Check if this is an upgrade (existing package with different version)
        const isUpgrade = installedPkg && installedPkg.attributes.version !== packageInfo.version;
        const oldVersion = installedPkg?.attributes.version;

        if (isUpgrade) {
          // Handle package upgrade - this will delete all old versions and save new one
          await updatePackageKnowledgeBaseVersion({
            esClient,
            pkgName: packageInfo.name,
            oldVersion,
            newVersion: packageInfo.version,
            knowledgeBaseContent: packageInfo.knowledge_base,
          });
        } else {
          // Handle fresh install - use existing logic
          await saveKnowledgeBaseContentToIndex({
            esClient,
            pkgName: packageInfo.name,
            pkgVersion: packageInfo.version,
            knowledgeBaseContent: packageInfo.knowledge_base,
          });
        }
      }
    } catch (error) {
      throw new Error(`Error saving knowledge base content: ${error}`);
    }
  }

  if (useStreaming) {
    context.nextState = 'save_archive_entries_from_assets_map';
  }

  return { packageAssetRefs };
}

export async function cleanupArchiveEntriesStep(context: InstallContext) {
  const {
    logger,
    savedObjectsClient,
    installedPkg,
    retryFromLastState,
    force,
    initialState,
    esClient,
  } = context;

  // In case of retry clean up previous installed assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.SAVE_ARCHIVE_ENTRIES &&
    installedPkg?.attributes?.package_assets &&
    installedPkg.attributes.package_assets.length > 0
  ) {
    const { package_assets: packageAssets } = installedPkg.attributes;

    logger.debug('Retry transition - clean up package archive assets');
    await withPackageSpan('Retry transition - clean up package archive assets', async () => {
      await removeArchiveEntries({ savedObjectsClient, refs: packageAssets });
    });

    // Also clean up knowledge base content
    if (esClient && installedPkg.attributes.name && installedPkg.attributes.version) {
      await deletePackageKnowledgeBase(
        esClient,
        installedPkg.attributes.name,
        installedPkg.attributes.version
      );
    }
  }
}
