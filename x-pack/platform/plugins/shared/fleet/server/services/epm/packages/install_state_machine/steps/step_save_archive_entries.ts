/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { appContextService } from '../../../../app_context';

import {
  ASSETS_SAVED_OBJECT_TYPE,
  KNOWLEDGE_BASE_SAVED_OBJECT_TYPE,
} from '../../../../../constants';

import {
  assetPathToObjectId,
  removeArchiveEntries,
  saveArchiveEntriesFromAssetsMap,
} from '../../../archive/storage';

import type { InstallContext } from '../_state_machine_package_install';
import { INSTALL_STATES } from '../../../../../../common/types';

import type { KnowledgeBaseItem, PackageKnowledgeBase } from '../../../../../../common/types';
import { withPackageSpan } from '../../utils';

export async function stepSaveArchiveEntries(context: InstallContext) {
  const { packageInstallContext, savedObjectsClient, installSource, useStreaming } = context;

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

      await saveArchiveEntriesFromAssetsMap({
        savedObjectsClient,
        assetsMap,
        paths,
        packageInfo,
        installSource,
      });
    } catch (error) {
      throw new Error(`Error saving archive entries: ${error}`);
    }
  }

  // Save knowledge base content if present
  if (packageInfo.knowledge_base && packageInfo.knowledge_base.length > 0) {
    try {
      await saveKnowledgeBaseContent({
        savedObjectsClient,
        pkgName: packageInfo.name,
        pkgVersion: packageInfo.version,
        knowledgeBaseContent: packageInfo.knowledge_base,
      });
    } catch (error) {
      throw new Error(`Error saving knowledge base content: ${error}`);
    }
  }

  if (useStreaming) {
    context.nextState = 'save_archive_entries_from_assets_map';
  }
}

export async function cleanupArchiveEntriesStep(context: InstallContext) {
  const { logger, savedObjectsClient, installedPkg, retryFromLastState, force, initialState } =
    context;

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
  }
}

/**
 * Saves knowledge base content as a separate document in Elasticsearch
 * @param savedObjectsClient - The saved objects client
 * @param pkgName - Package name
 * @param pkgVersion - Package version
 * @param knowledgeBaseContent - Array of knowledge base items
 */
export async function saveKnowledgeBaseContent({
  savedObjectsClient,
  pkgName,
  pkgVersion,
  knowledgeBaseContent,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
  knowledgeBaseContent: KnowledgeBaseItem[];
}) {
  if (!knowledgeBaseContent || knowledgeBaseContent.length === 0) {
    return;
  }

  // Using the imported KNOWLEDGE_BASE_SAVED_OBJECT_TYPE constant

  // Create knowledge base document
  const knowledgeBaseDoc: PackageKnowledgeBase = {
    package_name: pkgName,
    version: pkgVersion,
    installed_at: new Date().toISOString(),
    knowledge_base_content: knowledgeBaseContent,
  };

  // Save it as a saved object with the package name as the ID
  await savedObjectsClient.create(KNOWLEDGE_BASE_SAVED_OBJECT_TYPE, knowledgeBaseDoc, {
    id: pkgName,
    overwrite: true,
  });
}
