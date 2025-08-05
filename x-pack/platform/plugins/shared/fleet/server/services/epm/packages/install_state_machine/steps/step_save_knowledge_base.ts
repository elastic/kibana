/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetError } from '../../../../../errors';
import { appContextService } from '../../../../app_context';
import {
  saveKnowledgeBaseContentToIndex,
  deletePackageKnowledgeBase,
  updatePackageKnowledgeBaseVersion,
} from '../../knowledge_base_index';
import type { InstallContext } from '../_state_machine_package_install';
import { INSTALL_STATES } from '../../../../../../common/types';
import { withPackageSpan } from '../../utils';

export async function stepSaveKnowledgeBase(context: InstallContext): Promise<void> {
  const { packageInstallContext, esClient, installedPkg } = context;
  const { packageInfo } = packageInstallContext;

  // Save knowledge base content if present
  if (packageInfo.knowledge_base && packageInfo.knowledge_base.length > 0) {
    try {
      // First, check that one (or both) of the ai assistants are enabled via api calls
      const { securityAssistantStatus, observabilityAssistantStatus } =
        await appContextService.getO11yAndSecurityAssistantsStatus();

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
      throw new FleetError(`Error saving knowledge base content: ${error}`);
    }
  }
}

export async function cleanupKnowledgeBaseStep(context: InstallContext) {
  const { logger, esClient, installedPkg, retryFromLastState, force, initialState } = context;

  // Clean up knowledge base content during retry or rollback
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.SAVE_KNOWLEDGE_BASE &&
    esClient &&
    installedPkg?.attributes?.name &&
    installedPkg.attributes.version
  ) {
    logger.debug('Retry transition - clean up package knowledge base content');
    await withPackageSpan(
      'Retry transition - clean up package knowledge base content',
      async () => {
        await deletePackageKnowledgeBase(
          esClient,
          installedPkg.attributes.name,
          installedPkg.attributes.version
        );
      }
    );
  }
}
