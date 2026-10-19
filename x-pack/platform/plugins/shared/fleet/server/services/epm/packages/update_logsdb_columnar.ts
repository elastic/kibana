/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import pMap from 'p-map';

import {
  LOGSDB_COLUMNAR_INDEX_MODE,
  getLogsdbColumnarReadiness,
  getRegistryDataStreamAssetBaseName,
  isLogsdbColumnarReady,
} from '../../../../common/services';
import type { ColumnarPackageInfo } from '../../../../common/services/columnar_index_mode';
import { MAX_CONCURRENT_COMPONENT_TEMPLATES, PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { FleetErrorWithStatusCode, PackageNotFoundError } from '../../../errors';
import type { IndexTemplateEntry, Installation, RegistryDataStream } from '../../../types';
import { ElasticsearchAssetType } from '../../../types';
import { auditLoggingService } from '../../audit_logging';
import { createArchiveIteratorFromMap } from '../archive/archive_iterator';
import { getCurrentIndexModes } from '../elasticsearch/template/columnar_index_mode';
import {
  installComponentAndIndexTemplateForDataStream,
  prepareDataStreamTemplates,
} from '../elasticsearch/template/install';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

import { getInstallationObject, getInstalledPackageWithAssets } from './get';

export type InstalledPackageWithAssets = NonNullable<
  Awaited<ReturnType<typeof getInstalledPackageWithAssets>>
>;

/**
 * Elasticsearch rejects an index template whose composed mappings cannot be represented in a
 * columnar index mode. The raw error names the mapping parameter but not what to do about it, so
 * surface it as a 400 pointing at the data stream. Only applied when the target mode is
 * columnar: the same Elasticsearch errors mean something else entirely in any other mode.
 */
export function enrichColumnarIndexTemplateError(err: any, dataStream: string) {
  // Elasticsearch reports the composition failure at the top level and the actual mapping
  // problem further down the `caused_by` chain, so collect every reason along the chain.
  const reasons: string[] = [];
  let cause = err?.body?.error ?? err?.meta?.body?.error;
  while (cause && reasons.length < 10) {
    if (typeof cause.reason === 'string') reasons.push(cause.reason);
    cause = cause.caused_by;
  }
  const statusCode = err?.statusCode ?? err?.meta?.statusCode;
  const isColumnarMappingRejection =
    statusCode === 400 &&
    /doc_values|stored fields|synthetic source|not reconstructable|columnar/i.test(
      reasons.join(' ')
    );

  if (!isColumnarMappingRejection) {
    return err;
  }

  // The rejected template can be a namespace-scoped copy of the data stream's index template, in
  // which case the namespace's `@custom` template is the likely cause: name the one Elasticsearch
  // names.
  const rejectedTemplate =
    reasons.join(' ').match(/composable template \[([^\]]+)\]/)?.[1] ?? dataStream;

  return new FleetErrorWithStatusCode(
    `Elasticsearch rejected the ${LOGSDB_COLUMNAR_INDEX_MODE} index template for ${rejectedTemplate}: ${
      reasons.at(-1) ?? ''
    }`,
    400
  );
}

/**
 * The logs data streams of a package that declare columnar readiness (`opt_in` or `default`) —
 * the ones the installation-level toggle acts on. Data streams marked `unsupported`, data
 * streams of any other type and data streams with an `index_mode` are excluded.
 */
export function getColumnarReadyDataStreams(
  packageInfo: ColumnarPackageInfo,
  dataStreams: RegistryDataStream[] = []
): RegistryDataStream[] {
  return dataStreams.filter((dataStream) =>
    isLogsdbColumnarReady(getLogsdbColumnarReadiness(packageInfo, dataStream))
  );
}

/** The logs data streams a package explicitly marks as `unsupported` for columnar storage. */
export function getColumnarUnsupportedDataStreams(
  packageInfo: ColumnarPackageInfo,
  dataStreams: RegistryDataStream[] = []
): RegistryDataStream[] {
  return dataStreams.filter(
    (dataStream) => getLogsdbColumnarReadiness(packageInfo, dataStream) === 'unsupported'
  );
}

/**
 * The custom-dataset copies of the given data streams that the installation created, for package
 * policies that set their own dataset. They inherit the origin data stream's readiness, so the
 * installation-level choice applies to them too.
 */
export function getCustomDatasetDataStreams(
  installation: Installation | undefined,
  dataStreams: RegistryDataStream[]
): RegistryDataStream[] {
  return (installation?.installed_es ?? []).flatMap((ref) => {
    if (ref.type !== ElasticsearchAssetType.indexTemplate || !ref.customDataStreamOriginDataset) {
      return [];
    }
    const origin = dataStreams.find(
      (dataStream) =>
        dataStream.dataset === ref.customDataStreamOriginDataset &&
        dataStream.type === ref.customDataStreamOriginType
    );
    if (!origin) {
      return [];
    }
    // The index template is named `<type>-<dataset>`.
    const separator = ref.id.indexOf('-');
    return [{ ...origin, dataset: separator >= 0 ? ref.id.slice(separator + 1) : ref.id }];
  });
}

export async function getInstalledPackageOrThrow(
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string
): Promise<InstalledPackageWithAssets> {
  const installedPackageWithAssets = await getInstalledPackageWithAssets({
    savedObjectsClient,
    pkgName,
  });

  if (!installedPackageWithAssets) {
    throw new PackageNotFoundError(`package not found with assets ${pkgName}`);
  }

  return installedPackageWithAssets;
}

/**
 * Throws a 400 when the user asks to enable the columnar index mode for a package that has no
 * logs data stream ready for it. Runs before anything is persisted or written to Elasticsearch.
 */
export function assertLogsdbColumnarSupported({
  pkgName,
  packageInfo,
  enabled,
}: {
  pkgName: string;
  packageInfo: ColumnarPackageInfo & { data_streams?: RegistryDataStream[] };
  enabled: boolean;
}) {
  if (!enabled) {
    return;
  }
  if (getColumnarReadyDataStreams(packageInfo, packageInfo.data_streams).length === 0) {
    throw new FleetErrorWithStatusCode(
      `${pkgName} has no logs data stream that declares readiness for the ${LOGSDB_COLUMNAR_INDEX_MODE} index mode`,
      400
    );
  }
}

/**
 * Applies the user's installation-level `logsdb_columnar` choice to Elasticsearch and stores it.
 *
 * Shared by the update package API and the package policy editor so both behave the same: a
 * no-op when the stored choice already matches, a 400 when enabling a package without a ready
 * logs data stream, and nothing written until that check has passed. The choice is only stored
 * once Elasticsearch accepted it: a rejected change leaves the previous choice in place, so it
 * can be retried.
 */
export async function setLogsdbColumnarChoice({
  savedObjectsClient,
  esClient,
  logger,
  pkgName,
  enabled,
  installation,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
  pkgName: string;
  enabled: boolean;
  /** The installation saved object when the caller already holds it; fetched otherwise. */
  installation?: SavedObject<Installation>;
}): Promise<{ changed: boolean }> {
  const installedPackage =
    installation ?? (await getInstallationObject({ savedObjectsClient, pkgName }));
  if (!installedPackage) {
    throw new PackageNotFoundError(`Error while updating package: ${pkgName} is not installed`);
  }
  if (installedPackage.attributes.logsdb_columnar_enabled === enabled) {
    return { changed: false };
  }

  const installedPackageWithAssets = await getInstalledPackageOrThrow(savedObjectsClient, pkgName);
  assertLogsdbColumnarSupported({
    pkgName,
    packageInfo: installedPackageWithAssets.packageInfo,
    enabled,
  });

  await applyLogsdbColumnarIndexMode({
    esClient,
    savedObjectsClient,
    logger,
    pkgName,
    enabled,
    installedPackageWithAssets,
  });

  auditLoggingService.writeCustomSoAuditLog({
    action: 'update',
    id: installedPackage.id,
    name: installedPackage.attributes.name,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });
  await savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, installedPackage.id, {
    logsdb_columnar_enabled: enabled,
  });

  return { changed: true };
}

/**
 * Applies a change of the installation-level `logsdb_columnar` choice to Elasticsearch.
 *
 * Every columnar-ready logs data stream of the package, and every custom-dataset copy of one,
 * has its templates re-prepared with the new target mode and written in the mode-aware order (index template first when the mode is
 * being removed, component templates first when it is being added, which
 * `installComponentAndIndexTemplateForDataStream` takes care of, along with the namespace-scoped
 * copies of the index template), then the write indices are asked to roll over so the change
 * takes effect — in both directions.
 *
 * If Elasticsearch rejects any data stream, every data stream is put back on its previous mode,
 * the rejected ones included, and nothing is rolled over, so the change is all or nothing.
 * Persisting the choice on the installation saved object is the caller's job
 * (`setLogsdbColumnarChoice`), once this has succeeded.
 */
export async function applyLogsdbColumnarIndexMode({
  esClient,
  savedObjectsClient,
  logger,
  pkgName,
  enabled,
  installedPackageWithAssets,
}: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  pkgName: string;
  enabled: boolean;
  installedPackageWithAssets?: InstalledPackageWithAssets;
}): Promise<{ updatedDataStreams: string[] }> {
  const { packageInfo, paths, assetsMap, installation } =
    installedPackageWithAssets ?? (await getInstalledPackageOrThrow(savedObjectsClient, pkgName));

  const readyDataStreams = getColumnarReadyDataStreams(packageInfo, packageInfo.data_streams);

  if (readyDataStreams.length === 0) {
    assertLogsdbColumnarSupported({ pkgName, packageInfo, enabled });
    return { updatedDataStreams: [] };
  }

  const packageInstallContext = {
    archiveIterator: createArchiveIteratorFromMap(assetsMap),
    packageInfo,
    paths,
  };

  const dataStreams = [
    ...readyDataStreams,
    ...getCustomDatasetDataStreams(installation, readyDataStreams),
  ];
  const templateNames = dataStreams.map((dataStream) =>
    getRegistryDataStreamAssetBaseName(dataStream)
  );
  const targetIndexModes = new Map<string, string | undefined>(
    templateNames.map((name) => [name, enabled ? LOGSDB_COLUMNAR_INDEX_MODE : undefined])
  );
  // What each data stream goes back to if the change is rejected: its current mode, which is not
  // the same for every data stream when the package defaults put only some of them on columnar.
  const currentIndexModes = await getCurrentIndexModes(esClient, templateNames);
  const previousIndexModes = new Map<string, string | undefined>(
    templateNames.map((name) => [
      name,
      currentIndexModes.get(name) === LOGSDB_COLUMNAR_INDEX_MODE
        ? LOGSDB_COLUMNAR_INDEX_MODE
        : undefined,
    ])
  );

  const experimentalDataStreamFeatures = installation?.experimental_data_stream_features ?? [];

  const [targetTemplates, previousTemplates] = await Promise.all([
    prepareDataStreamTemplates(
      dataStreams,
      packageInstallContext,
      assetsMap,
      experimentalDataStreamFeatures,
      targetIndexModes
    ),
    prepareDataStreamTemplates(
      dataStreams,
      packageInstallContext,
      assetsMap,
      experimentalDataStreamFeatures,
      previousIndexModes
    ),
  ]);

  const updated: number[] = [];
  const rejected: number[] = [];
  const failures: unknown[] = [];

  // Writes the previous templates back in the mode-aware order, which also puts back whatever part
  // of a rejected change Elasticsearch had already accepted: the index template is written first
  // when a mode is removed, the component templates first when one is added.
  const restoreDataStreams = (indices: number[]) =>
    pMap(
      indices,
      async (index) => {
        const { componentTemplates, indexTemplate } = previousTemplates[index];
        await installComponentAndIndexTemplateForDataStream({
          esClient,
          logger,
          componentTemplates,
          indexTemplate,
        }).catch((rollbackErr) => {
          logger.error(
            `Failed to restore ${indexTemplate.templateName} after a rejected ${LOGSDB_COLUMNAR_INDEX_MODE} change: ${rollbackErr}`
          );
        });
      },
      { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
    );

  await pMap(
    targetTemplates,
    async ({ componentTemplates, indexTemplate }, index) => {
      try {
        await installComponentAndIndexTemplateForDataStream({
          esClient,
          logger,
          componentTemplates,
          indexTemplate,
        });
        updated.push(index);
      } catch (err) {
        rejected.push(index);
        failures.push(
          enabled ? enrichColumnarIndexTemplateError(err, indexTemplate.templateName) : err
        );
      }
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
  );

  if (failures.length > 0) {
    // Put every data stream back on its previous mode, so a rejected change leaves the whole
    // package as it was and can be retried.
    await restoreDataStreams([...updated, ...rejected]);
    throw failures[0];
  }

  const updatedIndexTemplates: IndexTemplateEntry[] = updated.map(
    (index) => targetTemplates[index].indexTemplate
  );

  await updateCurrentWriteIndices(esClient, logger, updatedIndexTemplates, {
    // The mode only takes effect at rollover, in both directions: turning it off resets the
    // template to the cluster default while the write index still carries `logsdb_columnar`.
    rolloverOnIndexModeReset: true,
  });

  return {
    updatedDataStreams: updatedIndexTemplates.map(({ templateName }) => templateName),
  };
}
