/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import {
  LOGSDB_COLUMNAR_INDEX_MODE,
  getLogsdbColumnarNotReadyDataStreams,
  getRegistryDataStreamAssetBaseName,
} from '../../../../common/services';
import { PACKAGE_TEMPLATE_SUFFIX, PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { FleetErrorWithStatusCode, PackageNotFoundError } from '../../../errors';
import type { IndexTemplateEntry, Installation } from '../../../types';
import { ElasticsearchAssetType } from '../../../types';
import { auditLoggingService } from '../../audit_logging';
import { createArchiveIteratorFromMap } from '../archive/archive_iterator';
import { retryTransientEsErrors } from '../elasticsearch/retry';
import { prepareDataStreamTemplates } from '../elasticsearch/template/install';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

import { getInstallationObject, getInstalledPackageWithAssets } from './get';
import { handleNamespaceTemplateRestoreAfterPackageInstall } from './namespace_datastream_templates';
import { fetchIndexTemplate } from './namespace_template_utils';

/** A data stream's index template and its `@package` component template. */
interface DataStreamTemplates {
  index: IndexTemplateEntry;
  component: ClusterPutComponentTemplateRequest;
}

const withIndexMode = (
  { templateName, indexTemplate }: IndexTemplateEntry,
  mode: string | undefined
): IndexTemplateEntry => {
  const { mode: _previousMode, ...index } = indexTemplate.template?.settings?.index ?? {};
  return {
    templateName,
    indexTemplate: {
      ...indexTemplate,
      template: {
        ...indexTemplate.template,
        settings: { ...indexTemplate.template?.settings, index: mode ? { ...index, mode } : index },
      },
    },
  };
};

const putIndexTemplate = (
  esClient: ElasticsearchClient,
  logger: Logger,
  { templateName, indexTemplate }: IndexTemplateEntry
) =>
  retryTransientEsErrors(
    () => esClient.indices.putIndexTemplate({ name: templateName, ...indexTemplate }),
    { logger }
  );

const putComponentTemplate = (
  esClient: ElasticsearchClient,
  logger: Logger,
  component: ClusterPutComponentTemplateRequest
) => retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(component), { logger });

/**
 * Turns the `logsdb_columnar` index mode on or off for an installed integration, through the
 * update package API, and stores the choice on the installation.
 *
 * It sets or removes `index.mode` on the index templates of the package's logs data streams and
 * of the custom datasets based on them, and rewrites their `@package` mappings as an install with
 * the new choice would: without `doc_values: false` and `store: true` in columnar mode. Their
 * namespace-scoped copies are rebuilt from them, as after an install. If any step fails, the
 * templates are put back and nothing is stored, so the request can be retried. The write indices
 * then roll over lazily, so the change applies to new data only.
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

  const installedWithAssets = await getInstalledPackageWithAssets({ savedObjectsClient, pkgName });
  if (!installedWithAssets) {
    throw new PackageNotFoundError(`Error while updating package: ${pkgName} is not installed`);
  }
  const { packageInfo, paths, assetsMap } = installedWithAssets;
  const logsDataStreams = (packageInfo.data_streams ?? []).filter(({ type }) => type === 'logs');
  const notReady = getLogsdbColumnarNotReadyDataStreams(packageInfo, logsDataStreams);
  if (enabled && (logsDataStreams.length === 0 || notReady.length > 0)) {
    throw new FleetErrorWithStatusCode(
      `${pkgName} can only use the ${LOGSDB_COLUMNAR_INDEX_MODE} index mode when all its logs data streams are ready for it${
        notReady.length > 0
          ? `; not ready: ${notReady.map(({ dataset }) => dataset).join(', ')}`
          : ''
      }`,
      400
    );
  }

  // A custom dataset's templates are its logs data stream's, under the custom dataset's name.
  const dataStreams = [
    ...logsDataStreams,
    ...(installedPackage.attributes.installed_es ?? []).flatMap((ref) => {
      const origin = logsDataStreams.find(
        ({ dataset }) => dataset === ref.customDataStreamOriginDataset
      );
      return ref.type === ElasticsearchAssetType.indexTemplate &&
        ref.customDataStreamOriginType === 'logs' &&
        origin
        ? [{ ...origin, dataset: ref.id.slice(ref.id.indexOf('-') + 1) }]
        : [];
    }),
  ];
  const mode = enabled ? LOGSDB_COLUMNAR_INDEX_MODE : undefined;
  const renderedTemplates = await prepareDataStreamTemplates(
    dataStreams,
    { archiveIterator: createArchiveIteratorFromMap(assetsMap), packageInfo, paths },
    assetsMap,
    installedPackage.attributes.experimental_data_stream_features,
    new Map(dataStreams.map((dataStream) => [getRegistryDataStreamAssetBaseName(dataStream), mode]))
  );

  const before: DataStreamTemplates[] = [];
  const after: DataStreamTemplates[] = [];
  for (const {
    componentTemplates,
    indexTemplate: { templateName },
  } of renderedTemplates) {
    const indexTemplate = await fetchIndexTemplate(esClient, templateName, 'logsdb_columnar');
    if (!indexTemplate) {
      continue;
    }
    const name = `${templateName}${PACKAGE_TEMPLATE_SUFFIX}`;
    const [
      {
        component_template: { template, _meta },
      },
    ] = (await esClient.cluster.getComponentTemplate({ name })).component_templates;
    const { mappings } = componentTemplates[name].template as { mappings: MappingTypeMapping };
    before.push({ index: { templateName, indexTemplate }, component: { name, template, _meta } });
    after.push({
      index: withIndexMode({ templateName, indexTemplate }, mode),
      component: { name, template: { ...template, mappings }, _meta },
    });
  }

  const restoreNamespaceTemplates = () =>
    handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient: savedObjectsClient,
      esClient,
      packageName: pkgName,
      packageInfo,
      dataStreams: packageInfo.data_streams ?? [],
    });
  // Elasticsearch checks the index templates that use a component template when it changes, so
  // columnar mappings go in before the mode is set, and the others after it's removed.
  const write = async (
    templates: DataStreamTemplates[],
    columnar: boolean,
    onError?: (err: unknown) => void
  ) => {
    const run = (step: () => Promise<unknown>) => (onError ? step().catch(onError) : step());
    const putComponentTemplates = async () => {
      for (const { component } of templates) {
        await run(() => putComponentTemplate(esClient, logger, component));
      }
    };
    if (columnar) {
      await putComponentTemplates();
    }
    for (const { index } of templates) {
      await run(() => putIndexTemplate(esClient, logger, index));
    }
    await run(restoreNamespaceTemplates);
    if (!columnar) {
      await putComponentTemplates();
    }
  };

  try {
    await write(after, enabled);
    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: installedPackage.id,
      name: installedPackage.attributes.name,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
    await savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, installedPackage.id, {
      logsdb_columnar_enabled: enabled,
    });
  } catch (err) {
    logger.error(`Could not change ${LOGSDB_COLUMNAR_INDEX_MODE} for ${pkgName}: ${err}`);
    await write(before, !enabled, (restoreErr) =>
      logger.error(`Could not put the templates of ${pkgName} back: ${restoreErr}`)
    );
    throw err;
  }

  await updateCurrentWriteIndices(
    esClient,
    logger,
    after.map(({ index }) => index),
    { rolloverOnIndexModeReset: true }
  );
  return { changed: true };
}
