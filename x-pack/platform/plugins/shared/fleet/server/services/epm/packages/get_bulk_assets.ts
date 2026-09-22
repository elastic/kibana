/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsClientContract,
  ISavedObjectTypeRegistry,
  SavedObjectsType,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';

import type { AssetSOObject, GetBulkAssetsResponse, SimpleSOAssetType } from '../../../../common';
import { ElasticsearchAssetType } from '../../../../common';
import { KibanaSavedObjectType } from '../../../../common/types';

import { displayedAssetTypesLookup } from '../../../../common/constants';

import type { SimpleSOAssetAttributes } from '../../../types';

type DisplayableSOAssetAttributes = SimpleSOAssetAttributes & {
  name?: string;
};

type AlertingRuleTemplateAttributes = DisplayableSOAssetAttributes & {
  engine?: 'v1' | 'v2';
  rule?: {
    metadata?: {
      name?: string;
      description?: string;
    };
  };
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

const getAppLinkForESAssetType = (type: string, id: string): string =>
  Object.values(ElasticsearchAssetType).includes(type as ElasticsearchAssetType)
    ? getKibanaLinkForESAsset(type as ElasticsearchAssetType, id)
    : '';

type BulkAssetWithEngine = SimpleSOAssetType & {
  attributes: SimpleSOAssetType['attributes'] & Pick<AlertingRuleTemplateAttributes, 'engine'>;
};

type BulkAssetItem = GetBulkAssetsResponse<BulkAssetWithEngine>['items'][number];

const isType = <TAttributes extends DisplayableSOAssetAttributes>(
  obj: SavedObject<DisplayableSOAssetAttributes>,
  type: string
): obj is SavedObject<TAttributes> => obj.type === type;

const toAssetType = (
  obj: SavedObject<DisplayableSOAssetAttributes>,
  soType: SavedObjectsType | undefined,
  appLink: string
): BulkAssetItem => {
  let attributes: BulkAssetItem['attributes'] = {
    title: soType?.management?.getTitle?.(obj) ?? obj.attributes?.title ?? obj.attributes?.name,
    description: obj.attributes?.description,
  };

  if (isType<AlertingRuleTemplateAttributes>(obj, KibanaSavedObjectType.alertingRuleTemplate)) {
    const { engine, rule } = obj.attributes;
    const ruleMetadata = rule?.metadata;
    attributes = {
      ...attributes,
      title: ruleMetadata?.name ?? attributes.title,
      description: ruleMetadata?.description ?? attributes.description,
      ...(engine === 'v1' || engine === 'v2' ? { engine } : {}),
    };
  }

  return {
    id: obj.id,
    type: obj.type as BulkAssetItem['type'],
    updatedAt: obj.updated_at,
    attributes,
    appLink,
  };
};

export async function getBulkAssets(
  soClient: SavedObjectsClientContract,
  soTypeRegistry: ISavedObjectTypeRegistry,
  assetIds: AssetSOObject[]
) {
  const { resolved_objects: resolvedObjects } =
    await soClient.bulkResolve<DisplayableSOAssetAttributes>(assetIds);
  const types: Record<string, SavedObjectsType | undefined> = {};

  const res: GetBulkAssetsResponse<BulkAssetWithEngine>['items'] = resolvedObjects
    .map(({ saved_object: savedObject }) => savedObject)
    .filter(
      (savedObject) =>
        (!isSavedObjectErrorResult(savedObject) || savedObject.error.statusCode !== 404) &&
        displayedAssetTypesLookup.has(savedObject.type)
    )
    .map((obj) => {
      if (isSavedObjectErrorResult(obj)) {
        // Elasticsearch assets aren't saved objects, so `bulkResolve` reports them as
        // unsupported types. They still need their Kibana links.
        return {
          id: obj.id,
          type: obj.type as unknown as ElasticsearchAssetType | KibanaSavedObjectType,
          attributes: {},
          appLink: getAppLinkForESAssetType(obj.type, obj.id),
        };
      }
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
        appLink = getAppLinkForESAssetType(obj.type, obj.id);
      }

      return toAssetType(obj, types[obj.type], appLink);
    });
  return res;
}
