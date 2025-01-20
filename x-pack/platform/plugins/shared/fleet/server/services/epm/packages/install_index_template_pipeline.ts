/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';

import type { PackageInstallContext } from '../../../../common/types';
import type { EsAssetReference, Installation, RegistryDataStream } from '../../../types';

import { prepareToInstallPipelines } from '../elasticsearch/ingest_pipeline';
import { prepareToInstallTemplates } from '../elasticsearch/template/install';

import { withPackageSpan } from './utils';
import { optimisticallyAddEsAssetReferences, updateEsAssetReferences } from './es_assets_reference';

export async function installIndexTemplatesAndPipelines({
  installedPkg,
  packageInstallContext,
  esReferences,
  savedObjectsClient,
  esClient,
  logger,
  onlyForDataStreams,
}: {
  installedPkg?: Installation;
  packageInstallContext: PackageInstallContext;
  esReferences: EsAssetReference[];
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
  onlyForDataStreams?: RegistryDataStream[];
}) {
  /**
   * In order to install assets in parallel, we need to split the preparation step from the installation step. This
   * allows us to know which asset references are going to be installed so that we can save them on the packages
   * SO before installation begins. In the case of a failure during installing any individual asset, we'll have the
   * references necessary to remove any assets in that were successfully installed during the rollback phase.
   *
   * This split of prepare/install could be extended to all asset types. Besides performance, it also allows us to
   * more easily write unit tests against the asset generation code without needing to mock ES responses.
   */
  const experimentalDataStreamFeatures = installedPkg?.experimental_data_stream_features ?? [];

  const preparedIngestPipelines = prepareToInstallPipelines(
    packageInstallContext,
    onlyForDataStreams
  );
  const preparedIndexTemplates = prepareToInstallTemplates(
    packageInstallContext,
    esReferences,
    experimentalDataStreamFeatures,
    onlyForDataStreams
  );

  // Update the references for the templates and ingest pipelines together. Need to be done together to avoid race
  // conditions on updating the installed_es field at the same time
  // These must be saved before we actually attempt to install the templates or pipelines so that we know what to
  // cleanup in the case that a single asset fails to install.
  let newEsReferences: EsAssetReference[] = [];

  if (!onlyForDataStreams) {
    newEsReferences = await updateEsAssetReferences(
      savedObjectsClient,
      packageInstallContext.packageInfo.name,
      esReferences,
      {
        assetsToRemove: preparedIndexTemplates.assetsToRemove,
        assetsToAdd: [
          ...preparedIngestPipelines.assetsToAdd,
          ...preparedIndexTemplates.assetsToAdd,
        ],
      }
    );
  }

  // Install index templates and ingest pipelines in parallel since they typically take the longest
  const [installedTemplates] = await Promise.all([
    withPackageSpan('Install index templates', () =>
      preparedIndexTemplates.install(esClient, logger)
    ),
    // installs versionized pipelines without removing currently installed ones
    withPackageSpan('Install ingest pipelines', () =>
      preparedIngestPipelines.install(esClient, logger)
    ),
  ]);

  // only add ES references if templates and pipelines were installed successfully, to prevent upgrade issues for referencing invalid template name
  if (onlyForDataStreams) {
    // if onlyForDataStreams is present that means we are in create package policy flow
    // not install flow, meaning we do not have a lock on the installation SO
    // so we need to use optimistic concurrency control
    newEsReferences = await optimisticallyAddEsAssetReferences(
      savedObjectsClient,
      packageInstallContext.packageInfo.name,
      [...preparedIngestPipelines.assetsToAdd, ...preparedIndexTemplates.assetsToAdd]
    );
  }

  return {
    esReferences: newEsReferences,
    installedTemplates,
  };
}
