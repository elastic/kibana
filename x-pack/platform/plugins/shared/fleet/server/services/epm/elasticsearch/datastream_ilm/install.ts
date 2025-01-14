/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import {
  ElasticsearchAssetType,
  type PackageInstallContext,
} from '../../../../../common/types/models';
import type { EsAssetReference, RegistryDataStream } from '../../../../../common/types/models';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';
import { getAssetFromAssetsMap } from '../../archive';

import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';

import { MAX_CONCURRENT_DATASTREAMS_ILM_OPERATIONS } from '../../../../constants';

import { deleteIlms } from './remove';

interface IlmInstallation {
  installationName: string;
  content: string;
}

interface IlmPathDataset {
  path: string;
  dataStream: RegistryDataStream;
}

export const installIlmForDataStream = async (
  packageInstallContext: PackageInstallContext,
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  esReferences: EsAssetReference[]
) => {
  const { packageInfo: registryPackage, paths, assetsMap } = packageInstallContext;
  const previousInstalledIlmEsAssets = esReferences.filter(
    ({ type }) => type === ElasticsearchAssetType.dataStreamIlmPolicy
  );

  // delete all previous ilm
  await deleteIlms(
    esClient,
    previousInstalledIlmEsAssets.map((asset) => asset.id)
  );

  if (previousInstalledIlmEsAssets.length > 0) {
    // remove the saved object reference
    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      registryPackage.name,
      esReferences,
      {
        assetsToRemove: previousInstalledIlmEsAssets,
      }
    );
  }

  // install the latest dataset
  const dataStreams = registryPackage.data_streams;
  if (!dataStreams?.length)
    return {
      installedIlms: [],
      esReferences,
    };

  const dataStreamIlmPaths = paths.filter((path) => isDataStreamIlm(path));
  let installedIlms: EsAssetReference[] = [];
  if (dataStreamIlmPaths.length > 0) {
    const ilmPathDatasets = dataStreams.reduce<IlmPathDataset[]>((acc, dataStream) => {
      dataStreamIlmPaths.forEach((path) => {
        if (isDatasetIlm(path, dataStream.path)) {
          acc.push({ path, dataStream });
        }
      });
      return acc;
    }, []);

    const ilmRefs = ilmPathDatasets.reduce<EsAssetReference[]>((acc, ilmPathDataset) => {
      if (ilmPathDataset) {
        acc.push({
          id: getIlmNameForInstallation(ilmPathDataset),
          type: ElasticsearchAssetType.dataStreamIlmPolicy,
        });
      }
      return acc;
    }, []);

    esReferences = await updateEsAssetReferences(
      savedObjectsClient,
      registryPackage.name,
      esReferences,
      { assetsToAdd: ilmRefs }
    );

    const ilmInstallations: IlmInstallation[] = ilmPathDatasets.map(
      (ilmPathDataset: IlmPathDataset) => {
        const content = JSON.parse(
          getAssetFromAssetsMap(assetsMap, ilmPathDataset.path).toString('utf-8')
        );
        content.policy._meta = getESAssetMetadata({ packageName: registryPackage.name });

        return {
          installationName: getIlmNameForInstallation(ilmPathDataset),
          content,
        };
      }
    );

    installedIlms = await pMap(
      ilmInstallations,
      async (ilmInstallation) => {
        return handleIlmInstall({ esClient, ilmInstallation, logger });
      },
      {
        concurrency: MAX_CONCURRENT_DATASTREAMS_ILM_OPERATIONS,
      }
    ).then((results) => results.flat());
  }

  return { installedIlms, esReferences };
};

async function handleIlmInstall({
  esClient,
  ilmInstallation,
  logger,
}: {
  esClient: ElasticsearchClient;
  ilmInstallation: IlmInstallation;
  logger: Logger;
}): Promise<EsAssetReference> {
  await retryTransientEsErrors(
    () =>
      esClient.transport.request({
        method: 'PUT',
        path: `/_ilm/policy/${ilmInstallation.installationName}`,
        body: ilmInstallation.content,
      }),
    { logger }
  );

  return { id: ilmInstallation.installationName, type: ElasticsearchAssetType.dataStreamIlmPolicy };
}

const isDataStreamIlm = (path: string) => {
  return new RegExp('(?<package>.*)/data_stream/(?<dataset>.*)/elasticsearch/ilm/*.*').test(path);
};

const isDatasetIlm = (path: string, datasetName: string) => {
  return new RegExp(`(?<package>.*)/data_stream\\/${datasetName}/elasticsearch/ilm/*.*`).test(path);
};

const getIlmNameForInstallation = (ilmPathDataset: IlmPathDataset) => {
  const filename = ilmPathDataset?.path.split('/')?.pop()?.split('.')[0];
  return `${ilmPathDataset.dataStream.type}-${ilmPathDataset.dataStream.package}.${ilmPathDataset.dataStream.path}-${filename}`;
};
