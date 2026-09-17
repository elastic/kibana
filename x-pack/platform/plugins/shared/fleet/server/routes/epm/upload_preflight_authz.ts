/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { KibanaAssetType } from '../../../common/types/models/epm';
import { FleetUnauthorizedError } from '../../errors';
import { appContextService } from '../../services';
import { getPathParts } from '../../services/epm/archive';
import { createArchiveIterator } from '../../services/epm/archive/archive_iterator';

// Asset types whose installation requires explicit authorization beyond base Fleet admin.
// If an archive contains a type listed here but ASSET_REQUIRED_PRIVILEGES has no entry
// for it, the upload is rejected (fail closed) until a checker is added.
const GATED_ASSET_TYPES = new Set<KibanaAssetType>([
  KibanaAssetType.securityRule,
  KibanaAssetType.securityAIPrompt,
  KibanaAssetType.osquerySavedQuery,
  KibanaAssetType.osqueryPackAsset,
  KibanaAssetType.mlModule,
  KibanaAssetType.cloudSecurityPostureRuleTemplate,
  KibanaAssetType.sloTemplate,
  // alertingRuleTemplate is intentionally excluded. It is a hidden SO type whose write access
  // is reserved exclusively for Fleet's internal SO client — no user-facing Kibana API privilege
  // grants write access (alerting_v2 rules.all grants only read on templates). Downstream rule
  // creation from installed templates enforces per-rule-type authz via rulesClient.
]);

// Maps each gated asset type to the Kibana API privilege actions required to install it.
// Types present in GATED_ASSET_TYPES but absent here are blocked until a checker is added.
const ASSET_REQUIRED_PRIVILEGES: Partial<Record<KibanaAssetType, readonly string[]>> = {
  [KibanaAssetType.securityRule]: ['rules-all'],
  [KibanaAssetType.securityAIPrompt]: ['elasticAssistant'],
  [KibanaAssetType.osquerySavedQuery]: ['osquery-writeSavedQueries'],
  [KibanaAssetType.osqueryPackAsset]: ['osquery-writePacks'],
  [KibanaAssetType.mlModule]: ['ml:canCreateJob'],
  [KibanaAssetType.cloudSecurityPostureRuleTemplate]: ['cloud-security-posture-all'],
  [KibanaAssetType.sloTemplate]: ['slo_write'],
};

export interface ArchiveSignals {
  gatedTypesFound: Set<KibanaAssetType>;
  blockedTypes: KibanaAssetType[];
  hasMlSecurityRules: boolean;
}

export async function collectArchiveSignals(
  archiveBuffer: Buffer,
  contentType: string
): Promise<ArchiveSignals> {
  const iterator = createArchiveIterator(archiveBuffer, contentType);
  const gatedTypesFound = new Set<KibanaAssetType>();
  const blockedTypes: KibanaAssetType[] = [];
  let hasMlSecurityRules = false;

  await iterator.traverseEntries(
    async (entry) => {
      const parts = getPathParts(entry.path);
      if (parts.service !== 'kibana') return;
      const assetType = parts.type as KibanaAssetType;
      if (!GATED_ASSET_TYPES.has(assetType)) return;

      if (!ASSET_REQUIRED_PRIVILEGES[assetType]) {
        blockedTypes.push(assetType);
        return;
      }

      gatedTypesFound.add(assetType);

      if (assetType === KibanaAssetType.securityRule && entry.buffer) {
        try {
          const asset = JSON.parse(entry.buffer.toString('utf8'));
          if (asset?.attributes?.type === 'machine_learning') {
            hasMlSecurityRules = true;
          }
        } catch {
          // Malformed JSON in a security_rule file; install will fail later with a better error.
        }
      }
    },
    (path) => {
      const parts = getPathParts(path);
      return parts.service === 'kibana' && parts.type === KibanaAssetType.securityRule;
    }
  );

  return { gatedTypesFound, blockedTypes, hasMlSecurityRules };
}

export function buildRequiredActions(
  signals: ArchiveSignals,
  security: SecurityPluginStart
): string[] {
  const privilegeNames = new Set<string>();

  for (const assetType of signals.gatedTypesFound) {
    const privileges = ASSET_REQUIRED_PRIVILEGES[assetType];
    if (privileges) {
      privileges.forEach((p) => privilegeNames.add(p));
    }
  }

  if (signals.hasMlSecurityRules) {
    privilegeNames.add('ml:canCreateJob');
  }

  return [...privilegeNames].map((name) => security.authz.actions.api.get(name));
}

export async function checkUploadPackageAssetPrivileges(
  request: KibanaRequest,
  archiveBuffer: Buffer,
  contentType: string,
  spaceId: string
): Promise<void> {
  const signals = await collectArchiveSignals(archiveBuffer, contentType);

  if (signals.blockedTypes.length > 0) {
    throw new FleetUnauthorizedError(
      `Package contains asset types that cannot be authorized for upload: ${[
        ...new Set(signals.blockedTypes),
      ].join(', ')}`
    );
  }

  if (signals.gatedTypesFound.size === 0 && !signals.hasMlSecurityRules) {
    return;
  }

  // Preflight authz requires the security plugin. Kibana deployments with security
  // disabled have no authz model to mirror, so uploads containing gated asset types
  // are blocked in that configuration.
  const security = appContextService.getSecurity();
  if (!security) {
    throw new FleetUnauthorizedError(
      'Uploading packages with privileged asset types requires the security plugin to be enabled'
    );
  }

  const actions = buildRequiredActions(signals, security);

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
