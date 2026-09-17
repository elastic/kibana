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

// Asset types whose installation requires explicit authorization beyond base Fleet admin.
// If an archive contains a type listed here but no privilege checker is defined in
// ASSET_REQUIRED_PRIVILEGES, the upload is rejected (fail closed).
const GATED_ASSET_TYPES = new Set<KibanaAssetType>([
  KibanaAssetType.securityRule,
  KibanaAssetType.securityAIPrompt,
  KibanaAssetType.osquerySavedQuery,
  KibanaAssetType.osqueryPackAsset,
  KibanaAssetType.mlModule,
  KibanaAssetType.alertingRuleTemplate,
  KibanaAssetType.cloudSecurityPostureRuleTemplate,
  KibanaAssetType.sloTemplate,
]);

// Maps each gated asset type to the Kibana API privilege actions required to install it.
// Types present in GATED_ASSET_TYPES but absent here have no static checker yet;
// uploads containing them are blocked until a checker is added.
const ASSET_REQUIRED_PRIVILEGES: Partial<Record<KibanaAssetType, readonly string[]>> = {
  [KibanaAssetType.securityRule]: ['rules-all'],
  [KibanaAssetType.securityAIPrompt]: ['elasticAssistant'],
  [KibanaAssetType.osquerySavedQuery]: ['osquery-writeSavedQueries'],
  [KibanaAssetType.osqueryPackAsset]: ['osquery-writePacks'],
  [KibanaAssetType.mlModule]: ['ml:canCreateJob'],
  // alertingRuleTemplate, cloudSecurityPostureRuleTemplate, sloTemplate:
  // privilege checks require per-ruleType / per-consumer authz — not yet implemented.
};

export async function checkUploadPackageAssetPrivileges(
  request: KibanaRequest,
  archiveBuffer: Buffer,
  contentType: string,
  spaceId: string
): Promise<void> {
  const iterator = createArchiveIterator(archiveBuffer, contentType);
  const requiredPrivilegeNames = new Set<string>();
  const blockedTypes: KibanaAssetType[] = [];

  await iterator.traverseEntries(async (entry) => {
    const parts = getPathParts(entry.path);
    if (parts.service !== 'kibana') return;
    const assetType = parts.type as KibanaAssetType;
    if (!GATED_ASSET_TYPES.has(assetType)) return;

    const privileges = ASSET_REQUIRED_PRIVILEGES[assetType];
    if (privileges) {
      privileges.forEach((p) => requiredPrivilegeNames.add(p));
    } else {
      blockedTypes.push(assetType);
    }
  }, () => false);

  if (blockedTypes.length > 0) {
    throw new FleetUnauthorizedError(
      `Package contains asset types that cannot be authorized for upload: ${[...new Set(blockedTypes)].join(', ')}`
    );
  }

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
