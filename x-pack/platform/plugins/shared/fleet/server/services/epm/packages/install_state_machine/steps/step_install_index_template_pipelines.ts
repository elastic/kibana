/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNormalizedDataStreams } from '../../../../../../common/services';

import { installIndexTemplatesAndPipelines } from '../../install_index_template_pipeline';
import { optimisticallyAddEsAssetReferences } from '../../es_assets_reference';
import { generateESIndexPatterns } from '../../../elasticsearch/template/template';

import type { InstallContext } from '../_state_machine_package_install';
import type { InstallablePackage, RegistryDataStream } from '../../../../../../common/types';
import type { EsAssetReference, Installation } from '../../../../../types';
import { withPackageSpan } from '../../utils';
import { deletePrerequisiteAssets, splitESAssets, cleanupComponentTemplate } from '../../remove';
import { INSTALL_STATES } from '../../../../../../common/types';

export async function stepInstallIndexTemplatePipelines(context: InstallContext) {
  const { esClient, savedObjectsClient, packageInstallContext, logger, installedPkg } = context;
  const { packageInfo } = packageInstallContext;
  const esReferences = context.esReferences ?? [];

  if (packageInfo.type === 'integration') {
    logger.debug(
      `Package install - Installing index templates and pipelines, packageInfo.type: ${packageInfo.type}`
    );
    const { installedTemplates, esReferences: templateEsReferences } = await withPackageSpan(
      'Install index templates and pipelines with packageInfo integration',
      () =>
        installIndexTemplatesAndPipelines({
          installedPkg: installedPkg ? installedPkg.attributes : undefined,
          packageInstallContext,
          esClient,
          savedObjectsClient,
          logger,
          esReferences,
        })
    );

    let finalEsReferences = templateEsReferences;
    if (installedPkg) {
      finalEsReferences = await reinstallCustomDatasetTemplates({
        packageInfo,
        packageInstallContext,
        installedPkg: installedPkg.attributes,
        savedObjectsClient,
        esClient,
        logger,
        esReferences: templateEsReferences,
      });
    }

    return {
      esReferences: finalEsReferences,
      indexTemplates: installedTemplates,
    };
  }

  if (packageInfo.type === 'input' && installedPkg) {
    // input packages create their data streams during package policy creation
    // we must use installed_es to infer which streams exist first then
    // we can install the new index templates
    logger.debug(`Package install - packageInfo.type: ${packageInfo.type}`);
    const indexTemplateRefs = installedPkg.attributes.installed_es.filter(
      (ref) => ref.type === 'index_template'
    );

    const dataStreams = indexTemplateRefs
      .flatMap((ref) => {
        // Index templates are named {type}-{dataset}; split on the first hyphen only
        // so dataset segments may contain hyphens. Pass encoded type into synthesis so
        // dynamic_signal_types packages (no manifest type) still get a concrete type here.
        const i = ref.id.indexOf('-');
        const dataStreamType = i >= 0 ? ref.id.slice(0, i) : undefined;
        const dataset = i >= 0 ? ref.id.slice(i + 1) : ref.id;
        return getNormalizedDataStreams(packageInfo, dataset, dataStreamType);
      })
      .filter((ds): ds is RegistryDataStream => !!ds.type);

    if (dataStreams.length) {
      const { installedTemplates, esReferences: templateEsReferences } = await withPackageSpan(
        'Install index templates and pipelines with packageInfo input',
        () =>
          installIndexTemplatesAndPipelines({
            installedPkg: installedPkg ? installedPkg.attributes : undefined,
            packageInstallContext,
            esClient,
            savedObjectsClient,
            logger,
            esReferences,
            onlyForDataStreams: dataStreams,
          })
      );
      return { esReferences: templateEsReferences, indexTemplates: installedTemplates };
    }
  }
}

async function reinstallCustomDatasetTemplates({
  packageInfo,
  packageInstallContext,
  installedPkg,
  savedObjectsClient,
  esClient,
  logger,
  esReferences,
}: {
  packageInfo: InstallablePackage;
  packageInstallContext: InstallContext['packageInstallContext'];
  installedPkg: Installation;
  savedObjectsClient: InstallContext['savedObjectsClient'];
  esClient: InstallContext['esClient'];
  logger: InstallContext['logger'];
  esReferences: EsAssetReference[];
}): Promise<EsAssetReference[]> {
  const customDataStreamRefs = installedPkg.installed_es.filter(
    (ref) => ref.type === 'index_template' && ref.customDataStreamOriginDataset
  );

  if (customDataStreamRefs.length === 0) return esReferences;

  const toReinstall: Array<{
    dataStream: RegistryDataStream;
    originInfo: { dataset: string; type: string };
  }> = [];

  for (const ref of customDataStreamRefs) {
    const i = ref.id.indexOf('-');
    const dataset = i >= 0 ? ref.id.slice(i + 1) : ref.id;

    const templateDs = (packageInfo.data_streams || []).find(
      (ds) =>
        ds.dataset === ref.customDataStreamOriginDataset &&
        ds.type === ref.customDataStreamOriginType
    );
    if (templateDs) {
      toReinstall.push({
        dataStream: { ...templateDs, dataset },
        originInfo: { dataset: templateDs.dataset, type: templateDs.type },
      });
    }
  }

  if (toReinstall.length === 0) return esReferences;

  let currentRefs = esReferences;

  for (const { dataStream, originInfo } of toReinstall) {
    try {
      await installIndexTemplatesAndPipelines({
        installedPkg,
        packageInstallContext,
        esClient,
        savedObjectsClient,
        logger,
        esReferences: currentRefs,
        onlyForDataStreams: [dataStream],
        customDataStreamOriginDataset: originInfo.dataset,
        customDataStreamOriginType: originInfo.type,
      });

      currentRefs = await optimisticallyAddEsAssetReferences(
        savedObjectsClient,
        packageInfo.name,
        [],
        generateESIndexPatterns([{ ...dataStream, path: dataStream.dataset }])
      );
    } catch (error) {
      logger.warn(
        `Failed to reinstall custom dataset template ${dataStream.dataset} for ${packageInfo.name}: ${error.message}`
      );
    }
  }

  return currentRefs;
}

export async function cleanupIndexTemplatePipelinesStep(context: InstallContext) {
  const { logger, esClient, installedPkg, retryFromLastState, force, initialState } = context;

  // In case of retry clean up previous installed assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.INSTALL_INDEX_TEMPLATE_PIPELINES &&
    installedPkg?.attributes?.installed_es &&
    installedPkg.attributes.installed_es.length > 0
  ) {
    const { installed_es: installedEs } = installedPkg.attributes;
    const { indexTemplatesAndPipelines, indexAssets, transformAssets } = splitESAssets(installedEs);

    logger.debug('Retry transition - clean up prerequisite ES assets first');
    await withPackageSpan('Retry transition - clean up prerequisite ES assets first', async () => {
      await deletePrerequisiteAssets(
        {
          indexAssets,
          transformAssets,
          indexTemplatesAndPipelines,
        },
        esClient
      );
    });
    logger.debug('Retry transition - clean up component template');
    await withPackageSpan('Retry transition - clean up component template', async () => {
      await cleanupComponentTemplate(installedEs, esClient);
    });
  }
}
