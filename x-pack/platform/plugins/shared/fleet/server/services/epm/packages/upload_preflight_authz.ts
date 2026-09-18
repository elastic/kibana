/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObject } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { KibanaAssetType, KibanaSavedObjectType, type Installation } from '../../../types';
import { FleetUnauthorizedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { getPathParts } from '../archive';
import { createArchiveIterator } from '../archive/archive_iterator';
import { PACKAGES_TO_INSTALL_WITH_STREAMING } from './install';

// Single source of truth: asset type → required Kibana API privileges.
// GATED_ASSET_TYPES is derived from the keys so the two stay in sync structurally.
const GATED_TYPE_REQUIRED_PRIVILEGES: Partial<Record<KibanaAssetType, readonly string[]>> = {
  [KibanaAssetType.securityRule]: ['rules-all'],
  [KibanaAssetType.securityAIPrompt]: ['elasticAssistant'],
};

const GATED_ASSET_TYPES = new Set(
  Object.keys(GATED_TYPE_REQUIRED_PRIVILEGES) as KibanaAssetType[]
);

// Maps SO types stored in installed_kibana refs back to KibanaAssetType for privilege decisions.
const SO_TYPE_TO_ASSET_TYPE = new Map<KibanaSavedObjectType, KibanaAssetType>([
  [KibanaSavedObjectType.securityRule, KibanaAssetType.securityRule],
  [KibanaSavedObjectType.securityAIPrompt, KibanaAssetType.securityAIPrompt],
]);

export interface ArchiveSignals {
  gatedTypesFound: Set<KibanaAssetType>;
  hasMlSecurityRules: boolean;
}

export async function collectArchiveSignals(
  archiveBuffer: Buffer,
  contentType: string
): Promise<ArchiveSignals> {
  const iterator = createArchiveIterator(archiveBuffer, contentType);
  const gatedTypesFound = new Set<KibanaAssetType>();
  let hasMlSecurityRules = false;

  await iterator.traverseEntries(
    async (entry) => {
      const parts = getPathParts(entry.path);

      if (parts.service !== 'kibana') return;
      const assetType = parts.type as KibanaAssetType;
      if (!GATED_ASSET_TYPES.has(assetType)) return;

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

  return { gatedTypesFound, hasMlSecurityRules };
}

export function buildRequiredActions(
  signals: ArchiveSignals,
  security: SecurityPluginStart
): string[] {
  const privilegeNames = new Set<string>();

  for (const assetType of signals.gatedTypesFound) {
    const privileges = GATED_TYPE_REQUIRED_PRIVILEGES[assetType];
    if (privileges) {
      privileges.forEach((p) => privilegeNames.add(p));
    }
  }

  if (signals.hasMlSecurityRules) {
    privilegeNames.add('ml:canCreateJob');
  }

  return [...privilegeNames].map((name) => security.authz.actions.api.get(name));
}

function detectGatedTypesInDestinationSpaces(
  installation: SavedObject<Installation> | undefined,
  destinationSpaces: string[],
  effectivePrimarySpace: string
): Set<KibanaAssetType> {
  const found = new Set<KibanaAssetType>();
  if (!installation) return found;

  for (const space of destinationSpaces) {
    const refs =
      space === effectivePrimarySpace
        ? installation.attributes.installed_kibana
        : installation.attributes.additional_spaces_installed_kibana?.[space];

    for (const ref of refs ?? []) {
      const assetType = SO_TYPE_TO_ASSET_TYPE.get(ref.type);
      if (assetType) found.add(assetType);
    }
  }
  return found;
}

export async function checkUploadPackageAssetPrivileges(
  request: KibanaRequest,
  archiveBuffer: Buffer,
  contentType: string,
  spaceId: string,
  pkgName: string | undefined,
  installation: SavedObject<Installation> | undefined
): Promise<string[]> {
  const signals = await collectArchiveSignals(archiveBuffer, contentType);

  // Compute destination spaces first — needed for both the existing-asset scan
  // and the privilege check, so the two are always consistent.
  const effectivePrimarySpace =
    installation?.attributes?.installed_kibana_space_id ?? DEFAULT_SPACE_ID;
  const isAdditionalSpaceInstall = !!installation && effectivePrimarySpace !== spaceId;

  // Streaming packages write only to the request Space regardless of primary/additional logic.
  // Mirror that here so we only check privileges for the Spaces that will actually be written.
  let destinationSpaces: string[];
  if (pkgName && PACKAGES_TO_INSTALL_WITH_STREAMING.includes(pkgName)) {
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

  // Union gated types from the new archive with gated types in the existing install,
  // scanned only for the destination spaces. This prevents a caller from removing
  // privileged assets in any destination by uploading a benign replacement: if the
  // new archive omits a gated type that exists in an installed Space (including an
  // additional Space), the cleanup step would delete it without a privilege check.
  const gatedTypesFromExisting = detectGatedTypesInDestinationSpaces(
    installation,
    destinationSpaces,
    effectivePrimarySpace
  );
  const effectiveGatedTypes = new Set([...signals.gatedTypesFound, ...gatedTypesFromExisting]);

  if (effectiveGatedTypes.size === 0 && !signals.hasMlSecurityRules) {
    // No gated asset types in archive or existing destination spaces; skip privilege check.
    return [];
  }

  // Preflight authz requires the security plugin. Kibana deployments with security
  // disabled have no authz model to mirror, so uploads affecting gated asset types
  // are blocked in that configuration.
  const security = appContextService.getSecurity();
  if (!security) {
    throw new FleetUnauthorizedError(
      'Uploading packages with privileged asset types requires the security plugin to be enabled'
    );
  }

  const actions = buildRequiredActions(
    { ...signals, gatedTypesFound: effectiveGatedTypes },
    security
  );

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
