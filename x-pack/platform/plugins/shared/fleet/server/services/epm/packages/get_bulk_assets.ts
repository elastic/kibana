/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  ISavedObjectTypeRegistry,
  SavedObjectsType,
} from '@kbn/core/server';

import type { AssetSOObject, SimpleSOAssetType } from '../../../../common';
import { ElasticsearchAssetType } from '../../../../common';
import { KibanaSavedObjectType } from '../../../../common/types';

import { displayedAssetTypesLookup } from '../../../../common/constants';

import type { SimpleSOAssetAttributes } from '../../../types';

type DisplayableSOAssetAttributes = SimpleSOAssetAttributes & {
  name?: string;
};

export type ExternalAssetMetadata = {
  title?: string;
  description?: string;
};

export type GetBulkAssetsOptions = {
  externalAssetEnricher?: (
    assets: AssetSOObject[]
  ) => Promise<Record<string, ExternalAssetMetadata>>;
};

const EXTERNAL_KIBANA_ASSET_TYPES = new Set<string>([
  KibanaSavedObjectType.workflow,
  KibanaSavedObjectType.agent,
]);

export const getKibanaLinkForExternalAsset = (type: KibanaSavedObjectType, id: string): string => {
  switch (type) {
    case KibanaSavedObjectType.workflow:
      return `/app/workflows/${encodeURIComponent(id)}`;
    case KibanaSavedObjectType.agent:
      return `/app/agent_builder/agents/${encodeURIComponent(id)}/overview`;
    default:
      return '';
  }
};

const getKibanaLinkForESAsset = (type: ElasticsearchAssetType, id: string): string => {
  switch (type) {
    case 'index':
      return `/app/management/data/index_management/indices/index_details?indexName=${id}`;
    case 'index_template':
      return `/app/management/data/index_management/templates/${id}`;
    case 'component_template':
      return `/app/management/data/index_management/component_templates/${id}`;
    case 'ingest_pipeline':
      return `/app/management/ingest/ingest_pipelines/?pipeline=${id}`;
    case 'ilm_policy':
      return `/app/management/data/index_lifecycle_management/policies/edit/${id}`;
    case 'data_stream_ilm_policy':
      return `/app/management/data/index_lifecycle_management/policies/edit/${id}`;
    case 'transform':
      return `/app/management/data/transform?_a=(transform:(queryText:${id}))`;
    case 'ml_model':
      return `/app/management/ml/trained_models?_a=(trained_models:(queryText:'model_id:(${id})'))`;
    case 'esql_view':
    // TODO Update when feature flag is turned on https://github.com/elastic/kibana/issues/244655
    default:
      return '';
  }
};

export async function getBulkAssets(
  soClient: SavedObjectsClientContract,
  soTypeRegistry: ISavedObjectTypeRegistry,
  assetIds: AssetSOObject[],
  options?: GetBulkAssetsOptions
) {
  const externalAssetIds = assetIds.filter(({ type }) => EXTERNAL_KIBANA_ASSET_TYPES.has(type));
  const savedObjectAssetIds = assetIds.filter(({ type }) => !EXTERNAL_KIBANA_ASSET_TYPES.has(type));

  const externalMetadata = options?.externalAssetEnricher
    ? await options.externalAssetEnricher(externalAssetIds)
    : {};

  const externalAssets: SimpleSOAssetType[] = externalAssetIds.map(({ id, type }) => {
    const metadata = externalMetadata[id];
    return {
      id,
      type: type as KibanaSavedObjectType,
      attributes: {
        title: metadata?.title ?? id,
        description: metadata?.description,
      },
      appLink: getKibanaLinkForExternalAsset(type as KibanaSavedObjectType, id),
    };
  });

  if (savedObjectAssetIds.length === 0) {
    return externalAssets;
  }

  const { resolved_objects: resolvedObjects } =
    await soClient.bulkResolve<DisplayableSOAssetAttributes>(savedObjectAssetIds);
  const types: Record<string, SavedObjectsType | undefined> = {};

  const res: SimpleSOAssetType[] = resolvedObjects
    .map(({ saved_object: savedObject }) => savedObject)
    .filter(
      (savedObject) =>
        savedObject?.error?.statusCode !== 404 && displayedAssetTypesLookup.has(savedObject.type)
    )
    .map((obj) => {
      // Kibana SOs are registered with an app URL getter, so try to use that
      // for retrieving links to assets whenever possible
      if (!types[obj.type]) {
        types[obj.type] = soTypeRegistry.getType(obj.type);
      }
      let appLink: string = '';
      try {
        if (types[obj.type]?.management?.getInAppUrl) {
          appLink = types[obj.type]!.management!.getInAppUrl!(obj)?.path || '';
        }
      } catch (e) {
        // Ignore errors from `getInAppUrl()`
        // This can happen if user can't access the saved object (i.e. in a different space)
      }

      // TODO: Ask for Kibana SOs to have `getInAppUrl()` registered so that the above works safely:
      //  security-rule
      //  csp-rule-template
      //  osquery-pack-asset
      //  osquery-saved-query

      // If we still don't have an app link at this point, manually map them (only ES types)
      if (!appLink) {
        if (Object.values(ElasticsearchAssetType).includes(obj.type as ElasticsearchAssetType)) {
          appLink = getKibanaLinkForESAsset(obj.type as ElasticsearchAssetType, obj.id);
        }
      }

      const title =
        types[obj.type]?.management?.getTitle?.(obj) ??
        obj.attributes?.title ??
        obj.attributes?.name;

      return {
        id: obj.id,
        type: obj.type as unknown as ElasticsearchAssetType | KibanaSavedObjectType,
        updatedAt: obj.updated_at,
        attributes: {
          title,
          description: obj.attributes?.description,
        },
        appLink,
      };
    });

  return [...res, ...externalAssets];
}
