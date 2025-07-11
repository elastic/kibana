/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';

import type {
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
  ISavedObjectsImporter,
  SavedObjectsImportSuccess,
  SavedObjectsImportFailure,
  Logger,
} from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server/rules_client';
import { createListStream } from '@kbn/utils';
import { partition, chunk, once } from 'lodash';

import { getPathParts } from '../../archive';
import { KibanaAssetType, KibanaSavedObjectType } from '../../../../types';
import type { AssetReference, Installation, PackageSpecTags } from '../../../../types';
import type { KibanaAssetReference, PackageInstallContext } from '../../../../../common/types';
import { MAX_CONCURRENT_PACKAGE_ASSETS } from '../../../../constants';
import {
  indexPatternTypes,
  getIndexPatternSavedObjects,
  makeManagedIndexPatternsGlobal,
} from '../index_pattern/install';
import { saveKibanaAssetsRefs } from '../../packages/install';
import { deleteKibanaSavedObjectsAssets } from '../../packages/remove';
import { FleetError, KibanaSOReferenceError } from '../../../../errors';
import { withPackageSpan } from '../../packages/utils';

import { appContextService } from '../../..';

import { tagKibanaAssets } from './tag_assets';
import { getSpaceAwareSaveobjectsClients } from './saved_objects';
import { installAlertRules, type AlertRuleAsset } from './alert_rules';

const MAX_ASSETS_TO_INSTALL_IN_PARALLEL = 200;

interface ObjectReference {
  type: string;
  id: string;
}

type SavedObjectsImporterContract = Pick<ISavedObjectsImporter, 'import' | 'resolveImportErrors'>;
const formatImportErrorsForLog = (errors: SavedObjectsImportFailure[]) =>
  JSON.stringify(
    errors.map(({ type, id, error }) => ({ type, id, error })) // discard other fields
  );
const validKibanaAssetTypes = new Set(Object.values(KibanaAssetType));

type SavedObjectKibanaAssetTypes = Exclude<KibanaAssetType, KibanaAssetType.alert>;
type SavedObjectToBe = Required<
  Pick<SavedObjectsBulkCreateObject, keyof Omit<SavedObjectAsset, 'assetType'>>
> & {
  type: KibanaSavedObjectType;
};

type SavedObjectAsset = Pick<
  SavedObject,
  | 'id'
  | 'attributes'
  | 'migrationVersion' // deprecated
  | 'references'
  | 'coreMigrationVersion'
  | 'typeMigrationVersion'
> & {
  type: KibanaSavedObjectType;
};

export type ArchiveAsset = SavedObjectAsset | AlertRuleAsset;
interface SavedObjectAssetEntry {
  path: string;
  asset: SavedObjectAsset;
  assetType: SavedObjectKibanaAssetTypes;
}

interface AlertRuleAssetEntry {
  path: string;
  asset: AlertRuleAsset;
  assetType: KibanaAssetType.alert;
}

type ArchiveAssetEntry = SavedObjectAssetEntry | AlertRuleAssetEntry;

// KibanaSavedObjectTypes are used to ensure saved objects being created for a given
// KibanaAssetType have the correct type
export const KibanaSavedObjectTypeMapping: Record<KibanaAssetType, KibanaSavedObjectType> = {
  [KibanaAssetType.alert]: KibanaSavedObjectType.alert,
  [KibanaAssetType.dashboard]: KibanaSavedObjectType.dashboard,
  [KibanaAssetType.indexPattern]: KibanaSavedObjectType.indexPattern,
  [KibanaAssetType.map]: KibanaSavedObjectType.map,
  [KibanaAssetType.search]: KibanaSavedObjectType.search,
  [KibanaAssetType.visualization]: KibanaSavedObjectType.visualization,
  [KibanaAssetType.lens]: KibanaSavedObjectType.lens,
  [KibanaAssetType.mlModule]: KibanaSavedObjectType.mlModule,
  [KibanaAssetType.securityAIPrompt]: KibanaSavedObjectType.securityAIPrompt,
  [KibanaAssetType.securityRule]: KibanaSavedObjectType.securityRule,
  [KibanaAssetType.cloudSecurityPostureRuleTemplate]:
    KibanaSavedObjectType.cloudSecurityPostureRuleTemplate,
  [KibanaAssetType.tag]: KibanaSavedObjectType.tag,
  [KibanaAssetType.osqueryPackAsset]: KibanaSavedObjectType.osqueryPackAsset,
  [KibanaAssetType.osquerySavedQuery]: KibanaSavedObjectType.osquerySavedQuery,
};

const AssetFilters: Record<string, (kibanaAssets: ArchiveAssetEntry[]) => ArchiveAssetEntry[]> = {
  [KibanaAssetType.indexPattern]: removeReservedIndexPatterns,
};

export function createSavedObjectKibanaAsset(asset: SavedObjectAsset): SavedObjectToBe {
  // convert that to an object
  const so: Partial<SavedObjectToBe> = {
    type: asset.type,
    id: asset.id,
    attributes: asset.attributes,
    references: asset.references || [],
  };

  // migrating deprecated migrationVersion to typeMigrationVersion
  if (asset.migrationVersion && asset.migrationVersion[asset.type]) {
    so.typeMigrationVersion = asset.migrationVersion[asset.type];
  }
  if (asset.coreMigrationVersion) {
    so.coreMigrationVersion = asset.coreMigrationVersion;
  }
  if (asset.typeMigrationVersion) {
    so.typeMigrationVersion = asset.typeMigrationVersion;
  }
  return so as SavedObjectToBe;
}

export async function installKibanaAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: SavedObjectsImporterContract;
  alertingRulesClient: RulesClient;
  logger: Logger;
  pkgName: string;
  spaceId: string;
  assetTags?: PackageSpecTags[];
  kibanaAssetsArchiveIterator: ReturnType<typeof getKibanaAssetsArchiveIterator>;
}): Promise<Array<ObjectReference | SavedObjectsImportSuccess>> {
  const {
    kibanaAssetsArchiveIterator,
    savedObjectsClient,
    savedObjectsImporter,
    alertingRulesClient,
    logger,
    pkgName,
    spaceId,
    assetTags,
  } = options;

  let assetsToInstall: ArchiveAssetEntry[] = [];
  let res: Array<ObjectReference | SavedObjectsImportSuccess> = [];

  const installManagedIndexPatternOnce = once(() =>
    installManagedIndexPattern({
      savedObjectsClient,
      savedObjectsImporter,
    })
  );

  interface InstallGroups {
    asSavedObjects: SavedObjectAsset[];
    asAlertRules: AlertRuleAsset[];
  }
  const createInstallGroups = (assetEntries: ArchiveAssetEntry[]) => {
    return assetEntries.reduce<InstallGroups>(
      (installGroups, assetEntry) => {
        if (assetEntry.assetType === KibanaAssetType.alert) {
          installGroups.asAlertRules = [...installGroups.asAlertRules, assetEntry.asset];
          return installGroups;
        }

        installGroups.asSavedObjects = [...installGroups.asSavedObjects, assetEntry.asset];
        return installGroups;
      },
      { asSavedObjects: [], asAlertRules: [] }
    );
  };

  async function flushAssetsToInstall() {
    await installManagedIndexPatternOnce();

    // split assets into SO installs and alert rule installs
    const { asSavedObjects, asAlertRules } = createInstallGroups(assetsToInstall);

    const installedAlertRules = await installAlertRules({
      logger,
      alertingRulesClient,
      alertRuleAssets: asAlertRules,
      assetsChunkSize: MAX_CONCURRENT_PACKAGE_ASSETS,
      context: { pkgName, spaceId, assetTags },
    });

    const installedAssets = await installKibanaSavedObjects({
      logger,
      savedObjectsImporter,
      kibanaAssets: asSavedObjects,
      assetsChunkSize: MAX_ASSETS_TO_INSTALL_IN_PARALLEL,
    });
    assetsToInstall = [];
    res = [...res, ...installedAssets, ...installedAlertRules];
  }

  await kibanaAssetsArchiveIterator(async (entry) => {
    const assetFilter = AssetFilters[entry.assetType];
    if (assetFilter) {
      assetsToInstall = [...assetsToInstall, ...assetFilter([entry])];
    } else {
      assetsToInstall.push(entry);
    }

    if (assetsToInstall.length >= MAX_ASSETS_TO_INSTALL_IN_PARALLEL) {
      await flushAssetsToInstall();
    }
  });

  if (assetsToInstall.length) {
    await flushAssetsToInstall();
  }

  return res;
}

export async function installManagedIndexPattern({
  savedObjectsClient,
  savedObjectsImporter,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsImporter: SavedObjectsImporterContract;
}) {
  if (appContextService.getConfig()?.enableManagedLogsAndMetricsDataviews === true) {
    await createDefaultIndexPatterns(savedObjectsImporter);
    await makeManagedIndexPatternsGlobal(savedObjectsClient);
  }
}

export async function createDefaultIndexPatterns(
  savedObjectsImporter: SavedObjectsImporterContract
) {
  // Create index patterns separately with `overwrite: false` to prevent blowing away users' runtime fields.
  // These don't get retried on conflict, because we expect that they exist once an integration has been installed.
  const indexPatternSavedObjects = getIndexPatternSavedObjects() as ArchiveAsset[];
  await savedObjectsImporter.import({
    overwrite: false,
    readStream: createListStream(indexPatternSavedObjects),
    createNewCopies: false,
    refresh: false,
    managed: true,
  });
}

export async function installKibanaAssetsAndReferencesMultispace({
  savedObjectsClient,
  alertingRulesClient,
  logger,
  pkgName,
  pkgTitle,
  packageInstallContext,
  installedPkg,
  spaceId,
  assetTags,
  installAsAdditionalSpace,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  alertingRulesClient: RulesClient;
  logger: Logger;
  pkgName: string;
  pkgTitle: string;
  packageInstallContext: PackageInstallContext;
  installedPkg?: SavedObject<Installation>;
  spaceId: string;
  assetTags?: PackageSpecTags[];
  installAsAdditionalSpace?: boolean;
}) {
  if (installedPkg && !installAsAdditionalSpace) {
    // Install in every space => upgrades
    const refs = await installKibanaAssetsAndReferences({
      savedObjectsClient,
      alertingRulesClient,
      logger,
      pkgName,
      pkgTitle,
      packageInstallContext,
      installedPkg,
      spaceId,
      assetTags,
      installAsAdditionalSpace,
    });

    for (const additionnalSpaceId of Object.keys(
      installedPkg.attributes.additional_spaces_installed_kibana ?? {}
    )) {
      await installKibanaAssetsAndReferences({
        savedObjectsClient,
        alertingRulesClient,
        logger,
        pkgName,
        pkgTitle,
        packageInstallContext,
        installedPkg,
        spaceId: additionnalSpaceId,
        assetTags,
        installAsAdditionalSpace: true,
      });
    }
    return refs;
  }

  return installKibanaAssetsAndReferences({
    savedObjectsClient,
    alertingRulesClient,
    logger,
    pkgName,
    pkgTitle,
    packageInstallContext,
    installedPkg,
    spaceId,
    assetTags,
    installAsAdditionalSpace,
  });
}

export async function installKibanaAssetsAndReferences({
  savedObjectsClient,
  alertingRulesClient,
  logger,
  pkgName,
  pkgTitle,
  packageInstallContext,
  installedPkg,
  spaceId,
  assetTags,
  installAsAdditionalSpace,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  alertingRulesClient: RulesClient;
  logger: Logger;
  pkgName: string;
  pkgTitle: string;
  packageInstallContext: PackageInstallContext;
  installedPkg?: SavedObject<Installation>;
  spaceId: string;
  assetTags?: PackageSpecTags[];
  installAsAdditionalSpace?: boolean;
}) {
  const { savedObjectsImporter, savedObjectTagAssignmentService, savedObjectTagClient } =
    getSpaceAwareSaveobjectsClients(spaceId);
  // This is where the memory consumption is rising up in the first place
  const kibanaAssetsArchiveIterator = getKibanaAssetsArchiveIterator(packageInstallContext);

  if (installedPkg) {
    await deleteKibanaSavedObjectsAssets({ savedObjectsClient, installedPkg, spaceId });
  }
  let installedKibanaAssetsRefs: KibanaAssetReference[] = [];

  const importedAssets = await installKibanaAssets({
    savedObjectsClient,
    logger,
    savedObjectsImporter,
    alertingRulesClient,
    pkgName,
    spaceId,
    assetTags,
    kibanaAssetsArchiveIterator,
  });
  const assets = importedAssets.map(
    (asset) =>
      ({
        id: 'destinationId' in asset && asset.destinationId ? asset.destinationId : asset.id,
        ...('destinationId' in asset && asset.destinationId ? { originId: asset.id } : {}),
        type: asset.type,
      } as KibanaAssetReference)
  );
  installedKibanaAssetsRefs = await saveKibanaAssetsRefs(
    savedObjectsClient,
    pkgName,
    assets,
    installedPkg && installedPkg.attributes.installed_kibana_space_id === spaceId
      ? false
      : installAsAdditionalSpace
  );

  await withPackageSpan('Create and assign package tags', () =>
    tagKibanaAssets({
      savedObjectTagAssignmentService,
      savedObjectTagClient,
      pkgTitle,
      pkgName,
      spaceId,
      importedAssets,
      assetTags,
    })
  );

  return installedKibanaAssetsRefs;
}

export async function deleteKibanaAssetsAndReferencesForSpace({
  savedObjectsClient,
  logger,
  pkgName,
  installedPkg,
  spaceId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  pkgName: string;
  installedPkg: SavedObject<Installation>;
  spaceId: string;
}) {
  if (!installedPkg) {
    return;
  }

  if (installedPkg.attributes.installed_kibana_space_id === spaceId) {
    throw new FleetError(
      'Impossible to delete kibana assets from the space where the package was installed, you must uninstall the package.'
    );
  }
  await deleteKibanaSavedObjectsAssets({ savedObjectsClient, installedPkg, spaceId });
  await saveKibanaAssetsRefs(savedObjectsClient, pkgName, null, true);
}

const kibanaAssetTypes = Object.values(KibanaAssetType);
export const isKibanaAssetType = (path: string) => {
  const parts = getPathParts(path);

  return parts.service === 'kibana' && (kibanaAssetTypes as string[]).includes(parts.type);
};

function getKibanaAssetsArchiveIterator(packageInstallContext: PackageInstallContext) {
  return (onEntry: (entry: ArchiveAssetEntry) => Promise<void>) => {
    return packageInstallContext.archiveIterator.traverseEntries(async (entry) => {
      if (!entry.buffer) {
        return;
      }

      const asset = JSON.parse(entry.buffer.toString('utf8'));

      const assetType = getPathParts(entry.path).type as KibanaAssetType;
      if (!validKibanaAssetTypes.has(assetType)) {
        return;
      }
      const soType = KibanaSavedObjectTypeMapping[assetType];
      if (asset.type === soType) {
        await onEntry({ path: entry.path, assetType, asset });
      }
    }, isKibanaAssetType);
  };
}

const isImportConflictError = (e: SavedObjectsImportFailure) => e?.error?.type === 'conflict';
/**
 * retry saved object import if only conflict errors are encountered
 */
async function retryImportOnConflictError(
  importCall: () => ReturnType<SavedObjectsImporterContract['import']>,
  {
    logger,
    maxAttempts = 50,
    _attempt = 0,
  }: { logger?: Logger; _attempt?: number; maxAttempts?: number } = {}
): ReturnType<SavedObjectsImporterContract['import']> {
  const result = await importCall();

  const errors = result.errors ?? [];
  if (_attempt < maxAttempts && errors.length && errors.every(isImportConflictError)) {
    const retryCount = _attempt + 1;
    const retryDelayMs = 1000 + Math.floor(Math.random() * 3000); // 1s + 0-3s of jitter

    logger?.debug(
      () =>
        `Retrying import operation after [${
          retryDelayMs * 1000
        }s] due to conflict errors: ${JSON.stringify(errors)}`
    );

    await setTimeout(retryDelayMs);
    return retryImportOnConflictError(importCall, { logger, _attempt: retryCount });
  }

  return result;
}

// only exported for testing
export async function installKibanaSavedObjects({
  savedObjectsImporter,
  kibanaAssets,
  assetsChunkSize,
  logger,
}: {
  kibanaAssets: SavedObjectAsset[];
  savedObjectsImporter: SavedObjectsImporterContract;
  logger: Logger;
  assetsChunkSize?: number;
}): Promise<SavedObjectsImportSuccess[]> {
  if (!assetsChunkSize || kibanaAssets.length <= assetsChunkSize || hasReferences(kibanaAssets)) {
    return await installKibanaSavedObjectsChunk({
      logger,
      savedObjectsImporter,
      kibanaAssets,
      refresh: 'wait_for',
    });
  }

  const installedAssets: SavedObjectsImportSuccess[] = [];

  // If the package size is too large, we need to install in chunks to avoid
  // memory issues as the SO import creates a lot of objects in memory

  // NOTE: if there are references, we can't chunk the install because
  // referenced objects might end up in different chunks leading to import
  // errors.
  const assetChunks = chunk(kibanaAssets, assetsChunkSize);
  const allAssetChunksButLast = assetChunks.slice(0, -1);
  const lastAssetChunk = assetChunks.slice(-1)[0];

  for (const assetChunk of allAssetChunksButLast) {
    const result = await installKibanaSavedObjectsChunk({
      logger,
      savedObjectsImporter,
      kibanaAssets: assetChunk,
      refresh: false,
    });

    installedAssets.push(...result);
  }

  const result = await installKibanaSavedObjectsChunk({
    logger,
    savedObjectsImporter,
    kibanaAssets: lastAssetChunk,
    refresh: 'wait_for',
  });

  installedAssets.push(...result);

  return installedAssets;
}

// only exported for testing
async function installKibanaSavedObjectsChunk({
  savedObjectsImporter,
  kibanaAssets,
  logger,
  refresh,
}: {
  kibanaAssets: SavedObjectAsset[];
  savedObjectsImporter: SavedObjectsImporterContract;
  logger: Logger;
  refresh?: boolean | 'wait_for';
}) {
  if (!kibanaAssets.length) {
    return [];
  }

  const toBeSavedObjects = kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset));

  let allSuccessResults: SavedObjectsImportSuccess[] = [];

  const {
    successResults: importSuccessResults = [],
    errors: importErrors = [],
    success,
  } = await retryImportOnConflictError(() => {
    const readStream = createListStream(toBeSavedObjects);
    return savedObjectsImporter.import({
      overwrite: true,
      readStream,
      createNewCopies: false,
      managed: true,
      refresh,
    });
  });

  if (success) {
    allSuccessResults = importSuccessResults;
  }

  const [referenceErrors, otherErrors] = partition(
    importErrors,
    (e) => e?.error?.type === 'missing_references'
  );

  if (otherErrors?.length) {
    throw new KibanaSOReferenceError(
      `Encountered ${otherErrors.length} errors creating saved objects: ${formatImportErrorsForLog(
        otherErrors
      )}`
    );
  }

  /*
    A reference error here means that a saved object reference in the references
    array cannot be found. This is an error in the package its-self but not a fatal
    one. For example a dashboard may still refer to the legacy `metricbeat-*` index
    pattern. We ignore reference errors here so that legacy version of a package
    can still be installed, but if a warning is logged it should be reported to
    the integrations team. */
  if (referenceErrors.length) {
    logger.debug(
      () =>
        `Resolving ${
          referenceErrors.length
        } reference errors creating saved objects: ${formatImportErrorsForLog(referenceErrors)}`
    );

    const retries = toBeSavedObjects.map(({ id, type }) => {
      if (referenceErrors.find(({ id: idToSearch }) => idToSearch === id)) {
        return {
          id,
          type,
          ignoreMissingReferences: true,
          replaceReferences: [],
          overwrite: true,
        };
      }
      return { id, type, overwrite: true, replaceReferences: [] };
    });

    const { successResults: resolveSuccessResults = [], errors: resolveErrors = [] } =
      await savedObjectsImporter.resolveImportErrors({
        readStream: createListStream(toBeSavedObjects),
        createNewCopies: false,
        managed: true,
        retries,
      });

    if (resolveErrors?.length) {
      throw new KibanaSOReferenceError(
        `Encountered ${
          resolveErrors.length
        } errors resolving reference errors: ${formatImportErrorsForLog(resolveErrors)}`
      );
    }

    allSuccessResults = allSuccessResults.concat(resolveSuccessResults);
  }

  return allSuccessResults;
}

// Filter out any reserved index patterns
function removeReservedIndexPatterns(kibanaAssets: ArchiveAssetEntry[]) {
  const reservedPatterns = indexPatternTypes.map((pattern) => `${pattern}-*`);

  return kibanaAssets.filter((assetEntry) => !reservedPatterns.includes(assetEntry.asset.id));
}

export function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type: type as KibanaSavedObjectType };

  return reference;
}

function hasReferences(assetsToInstall: SavedObjectAsset[]) {
  return assetsToInstall.some((asset) => asset.references.length);
}
