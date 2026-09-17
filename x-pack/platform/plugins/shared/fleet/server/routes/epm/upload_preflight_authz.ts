/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import { KibanaAssetType } from '../../../common/types/models/epm';
import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '../../services';
import { getPathParts } from '../../services/epm/archive';
import { createArchiveIterator } from '../../services/epm/archive/archive_iterator';

// Maps Kibana asset types to the API privileges required to install them via upload.
// Mirrors the privileges enforced by each feature's own write API routes.
const ASSET_REQUIRED_PRIVILEGES: Partial<Record<KibanaAssetType, readonly string[]>> = {
  [KibanaAssetType.securityRule]: ['rules-all'],
  [KibanaAssetType.securityAIPrompt]: ['elasticAssistant'],
  [KibanaAssetType.osquerySavedQuery]: ['osquery-writeSavedQueries'],
  [KibanaAssetType.osqueryPackAsset]: ['osquery-writePacks'],
  [KibanaAssetType.mlModule]: ['ml:canCreateJob'],
};

export async function checkUploadPackageAssetPrivileges(
  request: KibanaRequest,
  archiveBuffer: Buffer,
  contentType: string,
  spaceId: string
): Promise<void> {
  const iterator = createArchiveIterator(archiveBuffer, contentType);
  const requiredPrivilegeNames = new Set<string>();

  await iterator.traverseEntries(
    async (entry) => {
      const parts = getPathParts(entry.path);
      if (parts.service !== 'kibana') return;
      const assetType = parts.type as KibanaAssetType;
      const privileges = ASSET_REQUIRED_PRIVILEGES[assetType];
      if (privileges) {
        privileges.forEach((p) => requiredPrivilegeNames.add(p));
      }
    },
    () => false
  );

  if (requiredPrivilegeNames.size === 0) {
    return;
  }

  const security = appContextService.getSecurity();
  if (!security) {
    throw new FleetUnauthorizedError(
      'Cannot verify asset privileges: security plugin is not available'
    );
  }

  const actions = [...requiredPrivilegeNames].map((name) => security.authz.actions.api.get(name));

  const checkResult = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpaces([spaceId], { kibana: actions });

  if (!checkResult.hasAllRequested) {
    const missingActions = checkResult.privileges.kibana
      .filter((p) => !p.authorized)
      .map((p) => p.privilege);
    throw new FleetUnauthorizedError(
      `Insufficient privileges to upload this package. Missing: ${missingActions.join(', ')}`
    );
  }
}
