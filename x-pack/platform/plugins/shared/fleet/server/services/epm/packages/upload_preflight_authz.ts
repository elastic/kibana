/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { KibanaAssetType } from '../../../types';
import { FleetUnauthorizedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { getPathParts } from '../archive';
import { createArchiveIterator } from '../archive/archive_iterator';
import { getInstallationObject } from './get';

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

  // Upgrades propagate Kibana assets into every Space the package is already installed in.
  // Check the caller has the required privileges in all destination Spaces, not just the
  // current one, to prevent privilege escalation into Spaces the caller cannot access.
  const additionalSpaces = signals.pkgName
    ? Object.keys(
        (await getInstallationObject({ savedObjectsClient, pkgName: signals.pkgName }))?.attributes
          ?.additional_spaces_installed_kibana ?? {}
      )
    : [];

  const destinationSpaces = [...new Set([spaceId, ...additionalSpaces])];

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
}
