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

const GATED_ASSET_TYPES = new Set(Object.keys(GATED_TYPE_REQUIRED_PRIVILEGES) as KibanaAssetType[]);

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

  // Streaming packages persist all Kibana asset refs in installed_kibana regardless of which
  // Space triggered the install (saveKibanaAssetsRefs is called without saveAsAdditionnalSpace).
  // cleanUpUnusedKibanaAssetsStep reads installed_kibana unconditionally for the same reason.
  // Mirror that here so the preflight sees the same ref set as cleanup — otherwise a benign
  // upload in an additional Space would find additional_spaces_installed_kibana[spaceId] empty,
  // skip the privilege check, and let cleanup delete gated assets via the internal client.
  const isStreamingPackage =
    pkgName != null && PACKAGES_TO_INSTALL_WITH_STREAMING.includes(pkgName);

  // Build per-Space gated type sets: archive types (written to every destination Space) union
  // each Space's own existing gated types (which cleanUpUnusedKibanaAssetsStep would remove).
  // Keeping these sets per-Space avoids requiring privileges for a type in a Space that never
  // had it — e.g. if space-a holds rules and space-b holds AI prompts, space-a only needs
  // rules-all and space-b only needs elasticAssistant, not both everywhere.
  const spaceGatedTypes = new Map<string, Set<KibanaAssetType>>();
  for (const space of destinationSpaces) {
    const types = new Set(signals.gatedTypesFound);
    if (installation) {
      const refs =
        isStreamingPackage || space === effectivePrimarySpace
          ? installation.attributes.installed_kibana
          : installation.attributes.additional_spaces_installed_kibana?.[space];
      for (const ref of refs ?? []) {
        const assetType = SO_TYPE_TO_ASSET_TYPE.get(ref.type);
        if (assetType) types.add(assetType);
      }
    }
    spaceGatedTypes.set(space, types);
  }

  const anyGated =
    [...spaceGatedTypes.values()].some((s) => s.size > 0) || signals.hasMlSecurityRules;
  if (!anyGated) {
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

  // Group spaces with identical required action sets to minimise security API calls.
  // Spaces that need no privileged writes are pre-authorised and skipped.
  const actionGroupMap = new Map<string, { spaces: string[]; actions: string[] }>();
  for (const [space, types] of spaceGatedTypes) {
    const actions = buildRequiredActions(
      { gatedTypesFound: types, hasMlSecurityRules: signals.hasMlSecurityRules },
      security
    );
    if (actions.length === 0) continue;
    const key = [...actions].sort().join('\0');
    const group = actionGroupMap.get(key);
    if (group) {
      group.spaces.push(space);
    } else {
      actionGroupMap.set(key, { spaces: [space], actions });
    }
  }

  for (const { spaces, actions } of actionGroupMap.values()) {
    const checkResult = await security.authz
      .checkPrivilegesWithRequest(request)
      .atSpaces(spaces, { kibana: actions });
    if (!checkResult.hasAllRequested) {
      const missingActions = checkResult.privileges.kibana
        .filter((p) => !p.authorized)
        .map((p) => p.privilege);
      throw new FleetUnauthorizedError(
        `Insufficient privileges to upload this package. Missing: ${missingActions.join(', ')}`
      );
    }
  }

  // Return the exact set of Spaces that were authorised so callers can use it to cap
  // multispace propagation to the same snapshot (preventing TOCTOU bypass).
  return destinationSpaces;
}
