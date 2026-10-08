/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import {
  LOGSDB_COLUMNAR_INDEX_MODE,
  getLogsdbColumnarReadiness,
  getRegistryDataStreamAssetBaseName,
  isLogsdbColumnarReady,
} from '../../../../common/services';
import type { ColumnarPackageInfo } from '../../../../common/services/columnar_index_mode';
import { MAX_CONCURRENT_COMPONENT_TEMPLATES } from '../../../constants';
import { FleetErrorWithStatusCode, PackageNotFoundError } from '../../../errors';
import type { IndexTemplateEntry, RegistryDataStream } from '../../../types';
import { createArchiveIteratorFromMap } from '../archive/archive_iterator';
import {
  installComponentAndIndexTemplateForDataStream,
  installDataStreamComponentTemplates,
  prepareDataStreamTemplates,
} from '../elasticsearch/template/install';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

import { getInstalledPackageWithAssets } from './get';

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

  return new FleetErrorWithStatusCode(
    `Elasticsearch rejected the ${LOGSDB_COLUMNAR_INDEX_MODE} index template for ${dataStream}: ${
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
 * Applies a change of the installation-level `logsdb_columnar` choice to Elasticsearch.
 *
 * Every columnar-ready logs data stream of the package has its templates re-prepared with the
 * new target mode and written in the mode-aware order (index template first when the mode is
 * being removed, component templates first when it is being added, which
 * `installComponentAndIndexTemplateForDataStream` takes care of), then the write indices are
 * asked to roll over so the change takes effect — in both directions.
 *
 * Persisting the choice on the installation saved object is the caller's job (`updatePackage`);
 * it runs first so the stored state always reflects what Fleet is applying.
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

  const indexModesFor = (columnar: boolean) =>
    new Map<string, string | undefined>(
      readyDataStreams.map((dataStream) => [
        getRegistryDataStreamAssetBaseName(dataStream),
        columnar ? LOGSDB_COLUMNAR_INDEX_MODE : undefined,
      ])
    );

  const experimentalDataStreamFeatures = installation?.experimental_data_stream_features ?? [];

  // The "previous" set is what the component templates have to be restored to if Elasticsearch
  // rejects the new index template; it is the same templates prepared with the opposite mode.
  const [targetTemplates, previousTemplates] = await Promise.all([
    prepareDataStreamTemplates(
      readyDataStreams,
      packageInstallContext,
      assetsMap,
      experimentalDataStreamFeatures,
      indexModesFor(enabled)
    ),
    prepareDataStreamTemplates(
      readyDataStreams,
      packageInstallContext,
      assetsMap,
      experimentalDataStreamFeatures,
      indexModesFor(!enabled)
    ),
  ]);

  const updatedIndexTemplates: IndexTemplateEntry[] = [];

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
      } catch (err) {
        // Elasticsearch only validates the composed mappings when the index template is written,
        // which happens after the component templates were already rewritten. Put the previous
        // ones back so a rejected opt-in does not leave the data stream half-migrated.
        await installDataStreamComponentTemplates({
          esClient,
          logger,
          componentTemplates: previousTemplates[index].componentTemplates,
        }).catch((rollbackErr) => {
          logger.error(
            `Failed to restore component templates for ${indexTemplate.templateName} after a rejected ${LOGSDB_COLUMNAR_INDEX_MODE} change: ${rollbackErr}`
          );
        });
        throw enabled ? enrichColumnarIndexTemplateError(err, indexTemplate.templateName) : err;
      }
      updatedIndexTemplates.push(indexTemplate);
    },
    { concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES }
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
