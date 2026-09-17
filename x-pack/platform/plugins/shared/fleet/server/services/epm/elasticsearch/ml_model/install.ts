/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { getPathParts } from '../../archive';
import {
  ElasticsearchAssetType,
  type PackageInstallContext,
} from '../../../../../common/types/models';
import type { EsAssetReference } from '../../../../../common/types/models';

import { FleetError } from '../../../../errors';

import { retryTransientEsErrors } from '../retry';

import { updateEsAssetReferences } from '../../packages/es_assets_reference';

interface MlModelInstallation {
  installationName: string;
  content: string;
}

export const installMlModel = async (
  packageInstallContext: PackageInstallContext,
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences: EsAssetReference[]
) => {
  const mlModelPaths = packageInstallContext.paths.filter((path) => isMlModel(path));

  if (mlModelPaths.length === 0) {
    return esReferences;
  }

  const mlModelRefs = mlModelPaths.map((mlModelPath) => {
    const pathParts = mlModelPath.split('/');
    const modelId = pathParts[pathParts.length - 1].replace('.json', '');
    return { id: modelId, type: ElasticsearchAssetType.mlModel };
  });

  // Save all refs before any installs
  esReferences = await updateEsAssetReferences(
    savedObjectsClient,
    packageInstallContext.packageInfo.name,
    esReferences,
    { assetsToAdd: mlModelRefs }
  );

  const wantedPaths = new Set(mlModelPaths);
  let installError: unknown;
  await packageInstallContext.archiveIterator.traverseEntries(
    async (entry) => {
      if (installError) return;
      if (!wantedPaths.has(entry.path)) return;
      if (!entry.buffer) {
        installError = new FleetError(
          `No buffer for ML model archive entry at path: ${entry.path}`
        );
        return;
      }
      const pathParts = entry.path.split('/');
      const modelId = pathParts[pathParts.length - 1].replace('.json', '');
      try {
        await handleMlModelInstall({
          esClient,
          logger,
          mlModel: { installationName: modelId, content: entry.buffer.toString('utf-8') },
        });
      } catch (err) {
        installError = err;
      }
    },
    (path) => wantedPaths.has(path)
  );

  if (installError !== undefined) {
    throw installError;
  }

  return esReferences;
};

const isMlModel = (path: string) => {
  const pathParts = getPathParts(path);

  return !path.endsWith('/') && pathParts.type === ElasticsearchAssetType.mlModel;
};

async function handleMlModelInstall({
  esClient,
  logger,
  mlModel,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  mlModel: MlModelInstallation;
}): Promise<EsAssetReference> {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.ml.putTrainedModel(
          {
            model_id: mlModel.installationName,
            defer_definition_decompression: true,
            querystring: { timeout: '45s' },
            body: mlModel.content,
          },
          {
            headers: {
              'content-type': 'application/json',
            },
          }
        ),
      { logger }
    );
  } catch (err) {
    // swallow the error if the ml model already exists.
    const isAlreadyExistError =
      err instanceof errors.ResponseError &&
      err?.body?.error?.type === 'resource_already_exists_exception';
    if (!isAlreadyExistError) {
      throw err;
    }
  }

  return { id: mlModel.installationName, type: ElasticsearchAssetType.mlModel };
}
