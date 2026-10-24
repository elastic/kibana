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

import {
  LOGSDB_COLUMNAR_INDEX_MODE,
  getLogsdbColumnarNotReadyDataStreams,
  getRegistryDataStreamAssetBaseName,
} from '../../../../common/services';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { FleetErrorWithStatusCode, PackageNotFoundError } from '../../../errors';
import type { IndexTemplateEntry, Installation } from '../../../types';
import { ElasticsearchAssetType } from '../../../types';
import { auditLoggingService } from '../../audit_logging';
import { retryTransientEsErrors } from '../elasticsearch/retry';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

import { getInstallationObject, getPackageInfo } from './get';
import { handleNamespaceTemplateRestoreAfterPackageInstall } from './namespace_datastream_templates';
import { fetchIndexTemplate } from './namespace_template_utils';

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

/**
 * Turns the `logsdb_columnar` index mode on or off for an installed integration, through the
 * update package API, and stores the choice on the installation.
 *
 * The mappings are the same in both modes, so this only sets or removes `index.mode` on the index
 * templates of the package's logs data streams and of the custom datasets based on them. Their
 * namespace-scoped copies are rebuilt from them, as after an install. If any step fails, the index
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

  const packageInfo = await getPackageInfo({
    savedObjectsClient,
    pkgName,
    pkgVersion: installedPackage.attributes.version,
  });
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

  const datasets = new Set(logsDataStreams.map(({ dataset }) => dataset));
  const templateNames = [
    ...logsDataStreams.map((dataStream) => getRegistryDataStreamAssetBaseName(dataStream)),
    ...(installedPackage.attributes.installed_es ?? [])
      .filter(
        (ref) =>
          ref.type === ElasticsearchAssetType.indexTemplate &&
          ref.customDataStreamOriginType === 'logs' &&
          datasets.has(ref.customDataStreamOriginDataset ?? '')
      )
      .map(({ id }) => id),
  ];
  const templates: IndexTemplateEntry[] = [];
  const missing: string[] = [];
  for (const templateName of templateNames) {
    const indexTemplate = await fetchIndexTemplate(esClient, templateName, 'logsdb_columnar');
    if (indexTemplate) {
      templates.push({ templateName, indexTemplate });
    } else {
      missing.push(templateName);
    }
  }
  // Storing the choice with a template missing would leave its data stream on the other mode.
  if (missing.length > 0) {
    throw new FleetErrorWithStatusCode(
      `Could not change the ${LOGSDB_COLUMNAR_INDEX_MODE} index mode of ${pkgName}: missing index templates ${missing.join(
        ', '
      )}. Reinstall the package to restore them, then try again.`,
      409
    );
  }
  const switched = templates.map((template) =>
    withIndexMode(template, enabled ? LOGSDB_COLUMNAR_INDEX_MODE : undefined)
  );
  const restoreNamespaceTemplates = () =>
    handleNamespaceTemplateRestoreAfterPackageInstall({
      soClient: savedObjectsClient,
      esClient,
      packageName: pkgName,
      packageInfo,
      dataStreams: packageInfo.data_streams ?? [],
    });

  let written = 0;
  try {
    for (const template of switched) {
      await putIndexTemplate(esClient, logger, template);
      written++;
    }
    await restoreNamespaceTemplates();
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
    for (const template of templates.slice(0, written)) {
      await putIndexTemplate(esClient, logger, template).catch((restoreErr) =>
        logger.error(`Could not put ${template.templateName} back: ${restoreErr}`)
      );
    }
    await restoreNamespaceTemplates().catch((restoreErr) =>
      logger.error(`Could not put the namespace templates of ${pkgName} back: ${restoreErr}`)
    );
    throw err;
  }

  await updateCurrentWriteIndices(esClient, logger, switched, { rolloverOnIndexModeReset: true });
  return { changed: true };
}
