/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import type { ArchivePackage } from '../../../types';
import { KibanaAssetType, KibanaSavedObjectType, type Installation } from '../../../types';
import { FleetUnauthorizedError } from '../../../errors';
import { appContextService } from '../../app_context';
import { getPathParts, traverseArchiveEntries } from '../archive';
import { filterAssetPathForParseAndVerifyArchive, parseAndVerifyArchive } from '../archive/parse';
import { PACKAGES_TO_INSTALL_WITH_STREAMING } from './streaming_packages';

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
  // SO ids of every security_rule entry in the archive, used to detect whether the upload would
  // overwrite an existing ML rule whose id collides with an incoming non-ML rule.
  incomingRuleIds?: string[];
}

// Single implementation of per-entry signal collection shared by both archive-scanning functions.
// Mutates `out` in place; callers hold the accumulator object.
function collectSignalFromEntry(
  path: string,
  buffer: Buffer | undefined,
  out: {
    gatedTypesFound: Set<KibanaAssetType>;
    incomingRuleIds: string[];
    hasMlSecurityRules: boolean;
  }
): void {
  const parts = getPathParts(path);
  if (parts.service !== 'kibana') return;
  const assetType = parts.type as KibanaAssetType;
  if (!GATED_ASSET_TYPES.has(assetType)) return;
  out.gatedTypesFound.add(assetType);
  if (assetType === KibanaAssetType.securityRule && buffer) {
    try {
      const asset = JSON.parse(buffer.toString('utf8'));
      if (typeof asset?.id === 'string') out.incomingRuleIds.push(asset.id);
      if (asset?.attributes?.type === 'machine_learning') out.hasMlSecurityRules = true;
    } catch {
      // Malformed JSON in a security_rule file; install will fail later with a better error.
    }
  }
}

export async function collectArchiveSignals(
  archiveBuffer: Buffer,
  contentType: string
): Promise<ArchiveSignals> {
  const out = {
    gatedTypesFound: new Set<KibanaAssetType>(),
    incomingRuleIds: [] as string[],
    hasMlSecurityRules: false,
  };

  await traverseArchiveEntries(
    archiveBuffer,
    contentType,
    async (entry) => collectSignalFromEntry(entry.path, entry.buffer, out),
    (path) => {
      const parts = getPathParts(path);
      return parts.service === 'kibana' && parts.type === KibanaAssetType.securityRule;
    }
  );

  return out;
}

export async function parsePackageAndCollectSignals(
  archiveBuffer: Buffer,
  contentType: string
): Promise<{ packageInfo: ArchivePackage; archiveSignals: ArchiveSignals }> {
  const assetsMap: Record<string, Buffer> = {};
  const paths: string[] = [];
  const signalOut = {
    gatedTypesFound: new Set<KibanaAssetType>(),
    incomingRuleIds: [] as string[],
    hasMlSecurityRules: false,
  };

  await traverseArchiveEntries(
    archiveBuffer,
    contentType,
    async (entry) => {
      paths.push(entry.path);
      if (entry.buffer) assetsMap[entry.path] = entry.buffer;
      collectSignalFromEntry(entry.path, entry.buffer, signalOut);
    },
    (path) => {
      // Buffer manifest/lifecycle/tags for parseAndVerifyArchive, and
      // security_rule JSONs for ML-subtype detection.
      if (filterAssetPathForParseAndVerifyArchive(path)) return true;
      const parts = getPathParts(path);
      return parts.service === 'kibana' && parts.type === KibanaAssetType.securityRule;
    }
  );

  return {
    packageInfo: parseAndVerifyArchive(paths, assetsMap),
    archiveSignals: signalOut,
  };
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

export interface CheckUploadPackageAssetPrivilegesOptions {
  request: KibanaRequest;
  archiveSignals: ArchiveSignals;
  spaceId: string;
  pkgName: string;
  installation: SavedObject<Installation> | undefined;
  savedObjectsClient: SavedObjectsClientContract;
}

export async function checkUploadPackageAssetPrivileges({
  request,
  archiveSignals: signals,
  spaceId,
  pkgName,
  installation,
  savedObjectsClient,
}: CheckUploadPackageAssetPrivilegesOptions): Promise<string[]> {
  // Compute destination spaces first — needed for both the existing-asset scan
  // and the privilege check, so the two are always consistent.
  const effectivePrimarySpace =
    installation?.attributes?.installed_kibana_space_id ?? DEFAULT_SPACE_ID;
  const isAdditionalSpaceInstall = !!installation && effectivePrimarySpace !== spaceId;

  // Streaming packages persist all Kibana asset refs in installed_kibana regardless of which
  // Space triggered the install (saveKibanaAssetsRefs is called without saveAsAdditionnalSpace).
  // cleanUpUnusedKibanaAssetsStep reads installed_kibana unconditionally for the same reason.
  // Mirror that here so the preflight sees the same ref set as cleanup — otherwise a benign
  // upload in an additional Space would find additional_spaces_installed_kibana[spaceId] empty,
  // skip the privilege check, and let cleanup delete gated assets via the internal client.
  const isStreamingPackage = PACKAGES_TO_INSTALL_WITH_STREAMING.includes(pkgName);

  // Streaming packages write only to the request Space regardless of primary/additional logic.
  // Mirror that here so we only check privileges for the Spaces that will actually be written.
  let destinationSpaces: string[];
  if (isStreamingPackage || isAdditionalSpaceInstall) {
    destinationSpaces = [spaceId];
  } else {
    destinationSpaces = [
      ...new Set([
        spaceId,
        ...Object.keys(installation?.attributes?.additional_spaces_installed_kibana ?? {}),
      ]),
    ];
  }

  // Build per-Space data: gated asset types (archive types union existing ref types) and whether
  // any existing security rule in this Space is ML type (requires ml:canCreateJob).
  // Keeping these per-Space avoids requiring privileges for a type in a Space that never had it.
  // Stored refs carry only the SO type, not the rule subtype, so we read SO attributes to detect
  // ML rules. Primary/streaming spaces use the user-scoped client; additional spaces use an
  // internal client scoped to that namespace. Fail closed: any read error means assume ML present.
  const spaceData = new Map<string, { types: Set<KibanaAssetType>; hasMlRules: boolean }>();
  for (const space of destinationSpaces) {
    const types = new Set(signals.gatedTypesFound);
    const usePrimaryRefs = isStreamingPackage || space === effectivePrimarySpace;
    const refs = installation
      ? usePrimaryRefs
        ? installation.attributes.installed_kibana
        : installation.attributes.additional_spaces_installed_kibana?.[space]
      : undefined;
    for (const ref of refs ?? []) {
      const assetType = SO_TYPE_TO_ASSET_TYPE.get(ref.type);
      if (assetType) types.add(assetType);
    }

    let hasMlRules = signals.hasMlSecurityRules;
    // Only probe existing rule SOs when the archive scan didn't already confirm ML presence.
    // Process in bounded chunks and stop as soon as one ML rule (or any read error) is found —
    // avoids materialising the full ref list for large packages like security_detection_engine.
    //
    // Also include the incoming archive's rule IDs for the request Space: Fleet uses overwrite
    // semantics, so an incoming non-ML rule whose id collides with an existing ML rule would
    // silently replace it. By checking incoming ids here we require ml:canCreateJob whenever
    // the upload would clobber an ML rule, even on a first install.
    if (!hasMlRules) {
      const refRuleIds = (refs ?? [])
        .filter((ref) => ref.type === KibanaSavedObjectType.securityRule)
        .map((ref) => ref.id);
      const archiveRuleIds = signals.incomingRuleIds ?? [];
      const ruleIds = [...new Set([...refRuleIds, ...archiveRuleIds])];
      if (ruleIds.length > 0) {
        const clientForSpace = usePrimaryRefs
          ? savedObjectsClient
          : appContextService.getInternalUserSOClientForSpaceId(space);
        const CHUNK_SIZE = 100;
        outer: try {
          for (let i = 0; i < ruleIds.length; i += CHUNK_SIZE) {
            const chunk = ruleIds.slice(i, i + CHUNK_SIZE);
            const bulkResult = await clientForSpace.bulkGet<{ type?: string }>(
              chunk.map((id) => ({ type: KibanaSavedObjectType.securityRule, id }))
            );
            for (const so of bulkResult.saved_objects) {
              if (so.error) {
                if (so.error.statusCode !== 404) {
                  // Unexpected error — fail closed.
                  hasMlRules = true;
                  break outer;
                }
                // 404: rule doesn't exist yet, not ML — continue.
              } else if (so.attributes?.type === 'machine_learning') {
                hasMlRules = true;
                break outer;
              }
            }
          }
        } catch {
          hasMlRules = true;
        }
      }
    }

    spaceData.set(space, { types, hasMlRules });
  }

  const anyGated = [...spaceData.values()].some((d) => d.types.size > 0 || d.hasMlRules);
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
  for (const [space, { types, hasMlRules }] of spaceData) {
    const actions = buildRequiredActions(
      { gatedTypesFound: types, hasMlSecurityRules: hasMlRules },
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
      throw new FleetUnauthorizedError('Insufficient privileges to upload this package');
    }
  }

  return destinationSpaces;
}
