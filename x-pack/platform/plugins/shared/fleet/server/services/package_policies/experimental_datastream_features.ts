/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { merge } from 'lodash';

import type { ExperimentalIndexingFeature } from '../../../common/types';
import { getRegistryDataStreamAssetBaseName } from '../../../common/services';
import { PackageNotFoundError } from '../../errors';
import type {
  NewPackagePolicy,
  PackagePolicy,
  IndexTemplate,
  IndexTemplateEntry,
} from '../../types';
import { appContextService } from '../app_context';
import { createArchiveIteratorFromMap } from '../epm/archive/archive_iterator';
import { prepareDataStreamTemplates } from '../epm/elasticsearch/template/install';
import {
  isTotalFieldsLimitError,
  updateCurrentWriteIndices,
} from '../epm/elasticsearch/template/template';
import {
  DatasetOwnershipConflictError,
  assertComponentTemplatesMutable,
  claimBaseNameOf,
  getProspectiveTemplatesFromExisting,
  resolveDatasetOwnership,
} from '../epm/packages/dataset_ownership';
import { getInstalledPackageWithAssets } from '../epm/packages/get';
import { isOtelDataStream } from '../epm/packages/namespace_template_utils';
import { updateDatastreamExperimentalFeatures } from '../epm/packages/update';
import {
  applyDocOnlyValueToMapping,
  forEachMappings,
} from '../experimental_datastream_features_helper';

export async function handleExperimentalDatastreamFeatureOptIn({
  soClient,
  esClient,
  packagePolicy,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  packagePolicy: PackagePolicy | NewPackagePolicy;
}) {
  if (
    !packagePolicy.package?.experimental_data_stream_features ||
    (packagePolicy.package?.experimental_data_stream_features?.length ?? 0) === 0
  ) {
    return;
  }

  // If we're performing an update, we want to check if we actually need to perform
  // an update to the component templates for the package. So we fetch the saved object
  // for the package policy here to compare later.
  let installation;
  const templateMappings: { [key: string]: any } = {};
  let packageInfo:
    | NonNullable<Awaited<ReturnType<typeof getInstalledPackageWithAssets>>>['packageInfo']
    | undefined;

  if (packagePolicy.package) {
    const installedPackageWithAssets = await getInstalledPackageWithAssets({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package.name,
    });

    if (!installedPackageWithAssets) {
      throw new PackageNotFoundError(`package not found with assets ${packagePolicy.package.name}`);
    }
    installation = installedPackageWithAssets.installation;
    packageInfo = installedPackageWithAssets.packageInfo;
    const { paths, assetsMap } = installedPackageWithAssets;

    const packageInstallContext = {
      archiveIterator: createArchiveIteratorFromMap(assetsMap),
      packageInfo,
      paths,
    };
    const templates = await prepareDataStreamTemplates(
      packageInfo.data_streams ?? [],
      packageInstallContext,
      assetsMap,
      packagePolicy.package?.experimental_data_stream_features
    );

    templates.forEach((template) => {
      Object.keys(template.componentTemplates).forEach((templateName) => {
        templateMappings[templateName] =
          (template.componentTemplates[templateName].template as any).mappings ?? {};
      });
    });
  }

  const plannedWrites: Array<{
    dataStreamName: string;
    componentPut?: {
      name: string;
      body: Record<string, unknown>;
    };
    indexPut?: {
      name: string;
      body: Record<string, unknown>;
    };
    updatedIndexTemplate: IndexTemplateEntry;
  }> = [];

  for (const featureMapEntry of packagePolicy.package.experimental_data_stream_features) {
    const existingOptIn = installation?.experimental_data_stream_features?.find(
      (optIn) => optIn.data_stream === featureMapEntry.data_stream
    );

    const hasFeatureChanged = (name: ExperimentalIndexingFeature) =>
      existingOptIn?.features[name] !== featureMapEntry.features[name];

    const isSyntheticSourceOptInChanged = hasFeatureChanged('synthetic_source');

    const isTSDBOptInChanged = hasFeatureChanged('tsdb');

    const isDocValueOnlyNumericChanged = hasFeatureChanged('doc_value_only_numeric');
    const isDocValueOnlyOtherChanged = hasFeatureChanged('doc_value_only_other');

    if (
      [
        isSyntheticSourceOptInChanged,
        isTSDBOptInChanged,
        isDocValueOnlyNumericChanged,
        isDocValueOnlyOtherChanged,
      ].every((hasFlagChange) => !hasFlagChange)
    )
      continue;

    const componentTemplateName = `${featureMapEntry.data_stream}@package`;
    const componentTemplateRes = await esClient.cluster.getComponentTemplate({
      name: componentTemplateName,
    });

    const componentTemplate = componentTemplateRes.component_templates[0].component_template;

    const mappings = componentTemplate.template.mappings;
    const componentTemplateChanged =
      isDocValueOnlyNumericChanged || isDocValueOnlyOtherChanged || isSyntheticSourceOptInChanged;

    let mappingsProperties = componentTemplate.template.mappings?.properties;
    if (isDocValueOnlyNumericChanged || isDocValueOnlyOtherChanged) {
      forEachMappings(mappings?.properties ?? {}, (mappingProp, name) =>
        applyDocOnlyValueToMapping(
          mappingProp,
          name,
          featureMapEntry,
          isDocValueOnlyNumericChanged,
          isDocValueOnlyOtherChanged
        )
      );

      const templateProperties = (templateMappings[componentTemplateName] ?? {}).properties ?? {};
      // merge package spec mappings with generated mappings, so that index:false from package spec is not overwritten
      mappingsProperties = merge(templateProperties, mappings?.properties ?? {});
    }

    let sourceModeSettings = {};

    const indexTemplateRes = await esClient.indices.getIndexTemplate({
      name: featureMapEntry.data_stream,
    });

    let plannedComponentPut:
      | {
          name: string;
          body: Record<string, unknown>;
        }
      | undefined;
    let plannedIndexPut:
      | {
          name: string;
          body: Record<string, unknown>;
        }
      | undefined;

    if (isSyntheticSourceOptInChanged) {
      sourceModeSettings = featureMapEntry.features.synthetic_source
        ? {
            source: {
              mode: 'synthetic',
            },
          }
        : {};
    }

    if (componentTemplateChanged) {
      const body = {
        template: {
          ...componentTemplate.template,
          settings: {
            ...componentTemplate.template?.settings,
            index: {
              ...componentTemplate.template?.settings?.index,
              mapping: {
                ...componentTemplate.template?.settings?.index?.mapping,
                ...sourceModeSettings,
              },
            },
          },
          mappings: {
            ...mappings,
            properties: mappingsProperties ?? {},
          },
        },
      };

      const hasExperimentalDataStreamIndexingFeatures =
        featureMapEntry.features.synthetic_source ||
        featureMapEntry.features.doc_value_only_numeric ||
        featureMapEntry.features.doc_value_only_other;

      plannedComponentPut = {
        name: componentTemplateName,
        body: {
          ...body,
          _meta: {
            ...((componentTemplate._meta ?? {}) as Record<string, unknown>),
            has_experimental_data_stream_indexing_features:
              hasExperimentalDataStreamIndexingFeatures,
          },
        },
      };
    }

    const rawIndexTemplate = indexTemplateRes.index_templates[0].index_template;

    // Remove system-managed properties (dates) that cannot be set during create/update of index templates
    const {
      created_date: createdDate,
      created_date_millis: createdDateMillis,
      modified_date: modifiedDate,
      modified_date_millis: modifiedDateMillis,
      ...indexTemplate
    } = rawIndexTemplate as IndexTemplate;
    let updatedIndexTemplate = indexTemplate;

    if (isTSDBOptInChanged) {
      const indexTemplateBody = {
        ...indexTemplate,
        template: {
          ...(indexTemplate.template ?? {}),
          settings: {
            ...(indexTemplate.template?.settings ?? {}),
            index: {
              mode: featureMapEntry.features.tsdb ? 'time_series' : undefined,
            },
          },
        },
      };

      updatedIndexTemplate = indexTemplateBody as IndexTemplate;

      plannedIndexPut = {
        name: featureMapEntry.data_stream,
        body: {
          ...indexTemplateBody,
          _meta: {
            ...((indexTemplate._meta ?? {}) as Record<string, unknown>),
            has_experimental_data_stream_indexing_features: featureMapEntry.features.tsdb,
          },
          // GET brings string | string[] | undefined but this PUT expects string[]
          ignore_missing_component_templates: indexTemplateBody.ignore_missing_component_templates
            ? [indexTemplateBody.ignore_missing_component_templates].flat()
            : undefined,
        },
      };
    }

    plannedWrites.push({
      dataStreamName: featureMapEntry.data_stream,
      componentPut: plannedComponentPut,
      indexPut: plannedIndexPut,
      updatedIndexTemplate: {
        templateName: featureMapEntry.data_stream,
        indexTemplate: updatedIndexTemplate,
      },
    });
  }

  // Trigger rollover for updated datastreams
  if (plannedWrites.length > 0) {
    const packageName = packagePolicy.package?.name;
    // No package means no package-owned templates to patch, so there is nothing to authorize.
    if (!packageName || !packageInfo) return;

    const ownedTemplateNames = new Set(
      (packageInfo.data_streams ?? []).map((dataStream) =>
        getRegistryDataStreamAssetBaseName(dataStream, isOtelDataStream(dataStream, packageInfo))
      )
    );
    for (const write of plannedWrites) {
      const baseName = claimBaseNameOf(write.dataStreamName);
      if (!ownedTemplateNames.has(write.dataStreamName) && !ownedTemplateNames.has(baseName)) {
        throw new DatasetOwnershipConflictError(
          `Experimental data stream features for ${packageName} would modify "${write.dataStreamName}", ` +
            `which is not a data stream of this package.`
        );
      }
    }

    const updatedIndexTemplates = plannedWrites.map((write) => write.updatedIndexTemplate);
    const ownership = await resolveDatasetOwnership({
      esClient,
      soClient,
      packageName,
      prospective: getProspectiveTemplatesFromExisting(updatedIndexTemplates),
    });

    if (ownership.conflicts.length > 0) {
      throw new DatasetOwnershipConflictError(
        `Experimental data stream features for ${packageName} would modify resources it does not ` +
          `own: ` +
          ownership.conflicts.map(({ name, reason }) => `"${name}" (${reason})`).join(', ') +
          `. Adopt the dataset explicitly before enabling experimental features.`
      );
    }

    await assertComponentTemplatesMutable({
      esClient,
      soClient,
      packageName,
      names: plannedWrites.flatMap((write) =>
        write.componentPut ? [write.componentPut.name] : []
      ),
      installedEs: installation?.installed_es,
    });

    for (const write of plannedWrites) {
      if (write.componentPut) {
        await esClient.cluster.putComponentTemplate({
          name: write.componentPut.name,
          ...write.componentPut.body,
        } as Parameters<ElasticsearchClient['cluster']['putComponentTemplate']>[0]);
      }
      if (write.indexPut) {
        await esClient.indices.putIndexTemplate({
          name: write.indexPut.name,
          ...write.indexPut.body,
        } as Parameters<ElasticsearchClient['indices']['putIndexTemplate']>[0]);
      }
    }

    try {
      await updateCurrentWriteIndices(
        esClient,
        appContextService.getLogger(),
        updatedIndexTemplates,
        ownership.allowlist
      );
    } catch (err) {
      // total_fields handling unchanged
      if (isTotalFieldsLimitError(err)) {
        appContextService
          .getLogger()
          .warn(
            `Mappings update for experimental datastream features failed because the index mapping total_fields limit has been exceeded. ` +
              `The total_fields limit must be raised on the index template to allow this mapping update: ${err}`
          );
        return;
      }
      throw err;
    }
  }

  // Update the installation object to persist the experimental feature map
  await updateDatastreamExperimentalFeatures(
    soClient,
    packagePolicy.package.name,
    packagePolicy.package.experimental_data_stream_features
  );

  // Delete the experimental features map from the package policy so it doesn't get persisted
  delete packagePolicy.package.experimental_data_stream_features;
}
