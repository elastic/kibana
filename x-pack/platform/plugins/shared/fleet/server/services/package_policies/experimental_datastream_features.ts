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
import { getRegistryDataStreamAssetBaseName, isColumnarEligible } from '../../../common/services';
import { PackageNotFoundError } from '../../errors';
import type {
  NewPackagePolicy,
  PackagePolicy,
  IndexTemplate,
  IndexTemplateEntry,
} from '../../types';
import { appContextService } from '../app_context';
import { prepareDataStreamTemplates } from '../epm/elasticsearch/template/install';
import {
  isTotalFieldsLimitError,
  updateCurrentWriteIndices,
} from '../epm/elasticsearch/template/template';
import { getInstalledPackageWithAssets } from '../epm/packages/get';
import { updateDatastreamExperimentalFeatures } from '../epm/packages/update';

import {
  applyDocOnlyValueToMapping,
  forEachMappings,
} from '../experimental_datastream_features_helper';
import { createArchiveIteratorFromMap } from '../epm/archive/archive_iterator';

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
  // index.mode of each index template as prepared from the package with the *new* feature set.
  // With every mode-changing feature turned off this is exactly what the package manifest
  // declares (or undefined), which is what an opt-out must fall back to.
  const preparedIndexModes: { [templateName: string]: string | undefined } = {};
  // Data streams (keyed by index template name) the package declared as columnar-ready, either
  // through `elasticsearch.columnar.supported: true` or by declaring a columnar index_mode.
  const columnarEligibleDataStreams = new Set<string>();

  if (packagePolicy.package) {
    const installedPackageWithAssets = await getInstalledPackageWithAssets({
      savedObjectsClient: soClient,
      pkgName: packagePolicy.package.name,
    });

    if (!installedPackageWithAssets) {
      throw new PackageNotFoundError(`package not found with assets ${packagePolicy.package.name}`);
    }
    installation = installedPackageWithAssets.installation;
    const { packageInfo, paths, assetsMap } = installedPackageWithAssets;

    const packageInstallContext = {
      archiveIterator: createArchiveIteratorFromMap(assetsMap),
      packageInfo,
      paths,
    };
    (packageInfo.data_streams ?? []).forEach((dataStream) => {
      if (isColumnarEligible(dataStream)) {
        columnarEligibleDataStreams.add(getRegistryDataStreamAssetBaseName(dataStream));
      }
    });

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
      if (template.indexTemplate?.templateName) {
        preparedIndexModes[template.indexTemplate.templateName] =
          template.indexTemplate.indexTemplate?.template?.settings?.index?.mode;
      }
    });
  }

  const updatedIndexTemplates: IndexTemplateEntry[] = [];

  for (const featureMapEntry of packagePolicy.package.experimental_data_stream_features) {
    // Reject mutually exclusive combination before any ES write: a data stream cannot be both
    // TSDB and columnar.
    if (featureMapEntry.features.tsdb && featureMapEntry.features.columnar) {
      throw new Error(
        `data stream ${featureMapEntry.data_stream} cannot have both tsdb and columnar enabled simultaneously`
      );
    }

    // Turning columnar ON requires the package to have declared the data stream columnar-ready.
    // Turning it OFF is always allowed, so that an opt-in made before the package dropped the
    // declaration can still be undone.
    if (
      featureMapEntry.features.columnar &&
      !columnarEligibleDataStreams.has(featureMapEntry.data_stream)
    ) {
      throw new Error(
        `data stream ${featureMapEntry.data_stream} is not columnar-ready: the package does not declare elasticsearch.columnar.supported`
      );
    }

    const existingOptIn = installation?.experimental_data_stream_features?.find(
      (optIn) => optIn.data_stream === featureMapEntry.data_stream
    );

    const hasFeatureChanged = (name: ExperimentalIndexingFeature) =>
      existingOptIn?.features[name] !== featureMapEntry.features[name];

    const isSyntheticSourceOptInChanged = hasFeatureChanged('synthetic_source');

    const isTSDBOptInChanged = hasFeatureChanged('tsdb');

    const isColumnarOptInChanged = hasFeatureChanged('columnar');

    const isDocValueOnlyNumericChanged = hasFeatureChanged('doc_value_only_numeric');
    const isDocValueOnlyOtherChanged = hasFeatureChanged('doc_value_only_other');

    if (
      [
        isSyntheticSourceOptInChanged,
        isTSDBOptInChanged,
        isColumnarOptInChanged,
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

      await esClient.cluster.putComponentTemplate({
        name: componentTemplateName,
        ...body,
        _meta: {
          has_experimental_data_stream_indexing_features: hasExperimentalDataStreamIndexingFeatures,
        },
      });
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

    // Both tsdb and columnar are expressed through the same `settings.index.mode` key, so when
    // either (or both) changed we resolve the final mode once and issue a single PUT. Two
    // independent PUTs would let the second one clobber the mode written by the first.
    if (isTSDBOptInChanged || isColumnarOptInChanged) {
      // For non-logs data streams the logs profile defaults (host.name sort, logs pipeline) are
      // inappropriate, so use the base columnar mode instead of logsdb_columnar. Hidden data
      // streams are prefixed with a dot (`.logs-...`), strip it before reading the type.
      const dsType = featureMapEntry.data_stream.replace(/^\./, '').split('-')[0];
      const columnarMode = dsType === 'logs' ? 'logsdb_columnar' : 'columnar';

      // When opting out of both features, fall back to the mode the package itself declares
      // (from the template prepared above with the new feature set) rather than dropping the
      // key, so a manifest-declared index_mode survives the opt-out.
      const resolvedMode = featureMapEntry.features.tsdb
        ? 'time_series'
        : featureMapEntry.features.columnar
        ? columnarMode
        : preparedIndexModes[featureMapEntry.data_stream];

      // Preserve any existing index settings (sort, codec, etc.) — only touch mode.
      const { mode: _previousMode, ...existingIndexSettings } =
        updatedIndexTemplate.template?.settings?.index ?? {};

      const indexTemplateBody = {
        ...updatedIndexTemplate,
        template: {
          ...(updatedIndexTemplate.template ?? {}),
          settings: {
            ...(updatedIndexTemplate.template?.settings ?? {}),
            index: {
              ...existingIndexSettings,
              ...(resolvedMode ? { mode: resolvedMode } : {}),
            },
          },
        },
      };

      updatedIndexTemplate = indexTemplateBody as IndexTemplate;

      await esClient.indices.putIndexTemplate({
        name: featureMapEntry.data_stream,
        ...indexTemplateBody,
        _meta: {
          has_experimental_data_stream_indexing_features:
            featureMapEntry.features.tsdb || featureMapEntry.features.columnar,
        },
        // GET brings string | string[] | undefined but this PUT expects string[]
        ignore_missing_component_templates: indexTemplateBody.ignore_missing_component_templates
          ? [indexTemplateBody.ignore_missing_component_templates].flat()
          : undefined,
      });
    }

    updatedIndexTemplates.push({
      templateName: featureMapEntry.data_stream,
      indexTemplate: updatedIndexTemplate,
    });
  }

  // Trigger rollover for updated datastreams
  if (updatedIndexTemplates.length > 0) {
    try {
      await updateCurrentWriteIndices(
        esClient,
        appContextService.getLogger(),
        updatedIndexTemplates
      );
    } catch (err) {
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
