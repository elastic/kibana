/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { KibanaAssetType } from '../../../types';
import { FleetUnauthorizedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { getPathParts } from '../archive';
import { createArchiveIterator } from '../archive/archive_iterator';
import { getInstallationObject } from './get';
import { PACKAGES_TO_INSTALL_WITH_STREAMING } from './install';

const GATED_ASSET_TYPES = new Set<KibanaAssetType>([
  KibanaAssetType.securityRule,
  KibanaAssetType.securityAIPrompt,
]);

const ASSET_REQUIRED_PRIVILEGES: Partial<Record<KibanaAssetType, readonly string[]>> = {
  [KibanaAssetType.securityRule]: ['rules-all'],
  [KibanaAssetType.securityAIPrompt]: ['elasticAssistant'],
};

export interface ArchiveSignals {
  gatedTypesFound: Set<KibanaAssetType>;
  blockedTypes: KibanaAssetType[];
  hasMlSecurityRules: boolean;
  pkgName: string | undefined;
}

export async function collectArchiveSignals(
  archiveBuffer: Buffer,
  contentType: string
): Promise<ArchiveSignals> {
  const iterator = createArchiveIterator(archiveBuffer, contentType);
  const gatedTypesFound = new Set<KibanaAssetType>();
  const blockedTypes: KibanaAssetType[] = [];
  let hasMlSecurityRules = false;
  let pkgName: string | undefined;

  await iterator.traverseEntries(
    async (entry) => {
      const parts = getPathParts(entry.path);

      if (!pkgName && parts.pkgkey) {
        const match = parts.pkgkey.match(/^(.+)-(\d+\.\d+\.\d+.*)$/);
        if (match) pkgName = match[1];
      }

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

  return { gatedTypesFound, blockedTypes, hasMlSecurityRules, pkgName };
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
  spaceId: string,
  savedObjectsClient: SavedObjectsClientContract
): Promise<string[]> {
  const signals = await collectArchiveSignals(archiveBuffer, contentType);

  if (signals.blockedTypes.length > 0) {
    throw new FleetUnauthorizedError(
      `Package contains asset types that cannot be authorized for upload: ${[
        ...new Set(signals.blockedTypes),
      ].join(', ')}`
    );
  }

  if (signals.gatedTypesFound.size === 0 && !signals.hasMlSecurityRules) {
    // No gated asset types found; return empty set so callers skip propagation capping.
    return [];
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

  // Determine which Spaces will actually receive Kibana assets, mirroring the logic in
  // installKibanaAssetsAndReferencesMultispace:
  //   • First install or additional-space install: assets go only to the request Space.
  //   • Upgrade from the primary Space: assets fan out to every installed Space.
  // Only check privileges in the Spaces that will actually be written.
  const installation = signals.pkgName
    ? await getInstallationObject({
        savedObjectsClient,
        pkgName: signals.pkgName,
        failOnUnexpectedError: true,
      })
    : undefined;

  const effectivePrimarySpace =
    installation?.attributes?.installed_kibana_space_id ?? DEFAULT_SPACE_ID;
  const isAdditionalSpaceInstall = !!installation && effectivePrimarySpace !== spaceId;

  // Streaming packages write only to the request Space regardless of primary/additional logic.
  // Mirror that here so we only check privileges for the Spaces that will actually be written.
  let destinationSpaces: string[];
  if (signals.pkgName && PACKAGES_TO_INSTALL_WITH_STREAMING.includes(signals.pkgName)) {
    destinationSpaces = [spaceId];
  } else if (isAdditionalSpaceInstall) {
    destinationSpaces = [spaceId];
  } else {
    destinationSpaces = [
      ...new Set([
        spaceId,
        ...Object.keys(installation?.attributes?.additional_spaces_installed_kibana ?? {}),
      ]),
    ];
  }

  const checkResult = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpaces(destinationSpaces, { kibana: actions });

  if (!checkResult.hasAllRequested) {
    const missingActions = checkResult.privileges.kibana
      .filter((p) => !p.authorized)
      .map((p) => p.privilege);
    throw new FleetUnauthorizedError(
      `Insufficient privileges to upload this package. Missing: ${missingActions.join(', ')}`
    );
  }

  // Return the exact set of Spaces that were authorized so callers can use it to cap
  // multispace propagation to the same snapshot (preventing TOCTOU bypass).
  return destinationSpaces;
}
