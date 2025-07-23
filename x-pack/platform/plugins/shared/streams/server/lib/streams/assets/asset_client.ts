/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { IStorageClient } from '@kbn/storage-adapter';
import { keyBy, partition } from 'lodash';
import objectHash from 'object-hash';
import pLimit from 'p-limit';
import {
  ASSET_TYPES,
  Asset,
  AssetLink,
  AssetLinkRequest,
  AssetUnlinkRequest,
  AssetType,
  AssetWithoutUuid,
  DashboardLink,
  QueryAsset,
  QueryLink,
  RuleLink,
  SloLink,
} from '../../../../common/assets';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_KQL_BODY,
  QUERY_TITLE,
  STREAM_NAME,
} from './fields';
import { AssetStorageSettings } from './storage_settings';
import { AssetNotFoundError } from '../errors/asset_not_found_error';

interface TermQueryOpts {
  queryEmptyString: boolean;
}

type TermQueryFieldValue = string | boolean | number | null;

function termQuery<T extends string>(
  field: T,
  value: TermQueryFieldValue | undefined,
  opts: TermQueryOpts = { queryEmptyString: true }
): QueryDslQueryContainer[] {
  if (value === null || value === undefined || (!opts.queryEmptyString && value === '')) {
    return [];
  }

  return [{ term: { [field]: value } }];
}

function termsQuery<T extends string>(
  field: T,
  values: Array<TermQueryFieldValue | undefined> | null | undefined
): QueryDslQueryContainer[] {
  if (values === null || values === undefined || values.length === 0) {
    return [];
  }

  const filteredValues = values.filter(
    (value) => value !== undefined
  ) as unknown as TermQueryFieldValue[];

  return [{ terms: { [field]: filteredValues } }];
}

export function getAssetLinkUuid(name: string, asset: Pick<AssetLink, 'asset.id' | 'asset.type'>) {
  return objectHash({
    [STREAM_NAME]: name,
    [ASSET_ID]: asset[ASSET_ID],
    [ASSET_TYPE]: asset[ASSET_TYPE],
  });
}

function toAssetLink<TAssetLink extends AssetLinkRequest>(
  name: string,
  asset: TAssetLink
): TAssetLink & { [ASSET_UUID]: string } {
  return {
    ...asset,
    [ASSET_UUID]: getAssetLinkUuid(name, asset),
  };
}

function sloSavedObjectToAsset(
  sloId: string,
  savedObject: SavedObject<{ name: string; tags: string[] }>
) {
  return {
    [ASSET_ID]: sloId,
    [ASSET_TYPE]: 'slo' as const,
    title: savedObject.attributes.name,
    tags: savedObject.attributes.tags.concat(
      savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id)
    ),
  };
}

function dashboardSavedObjectToAsset(
  dashboardId: string,
  savedObject: SavedObject<{ title: string }>
) {
  return {
    [ASSET_ID]: dashboardId,
    [ASSET_TYPE]: 'dashboard' as const,
    title: savedObject.attributes.title,
    tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
  };
}

function ruleToAsset(ruleId: string, rule: SanitizedRule) {
  return {
    [ASSET_TYPE]: 'rule' as const,
    [ASSET_ID]: ruleId,
    title: rule.name,
    tags: rule.tags,
  };
}

type StoredQueryLink = Omit<QueryLink, 'query'> & {
  [QUERY_TITLE]: string;
  [QUERY_KQL_BODY]: string;
};

export type StoredAssetLink = (SloLink | RuleLink | DashboardLink | StoredQueryLink) & {
  [STREAM_NAME]: string;
};

interface AssetBulkIndexOperation {
  index: { asset: AssetLinkRequest };
}
interface AssetBulkDeleteOperation {
  delete: { asset: AssetUnlinkRequest };
}

function fromStorage(link: StoredAssetLink): AssetLink {
  if (link[ASSET_TYPE] === 'query') {
    return {
      ...link,
      query: {
        id: link['asset.id'],
        title: link['query.title'],
        kql: {
          query: link['query.kql.query'],
        },
      },
    } satisfies QueryLink;
  }
  return link;
}

function toStorage(name: string, request: AssetLinkRequest): StoredAssetLink {
  const link = toAssetLink(name, request);
  if (link[ASSET_TYPE] === 'query') {
    const { query, ...rest } = link;
    return {
      ...rest,
      [STREAM_NAME]: name,
      'query.title': query.title,
      'query.kql.query': query.kql.query,
    };
  }

  return {
    ...link,
    [STREAM_NAME]: name,
  };
}

export type AssetBulkOperation = AssetBulkIndexOperation | AssetBulkDeleteOperation;

export class AssetClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<AssetStorageSettings, StoredAssetLink>;
      soClient: SavedObjectsClientContract;
      rulesClient: RulesClient;
    }
  ) {}

  async linkAsset(name: string, link: AssetLinkRequest): Promise<AssetLink> {
    const document = toStorage(name, link);

    await this.clients.storageClient.index({
      id: document[ASSET_UUID],
      document,
    });

    return toAssetLink(name, link);
  }

  async syncAssetList(
    name: string,
    links: AssetLinkRequest[],
    assetType?: AssetType
  ): Promise<{ deleted: AssetLink[]; indexed: AssetLink[] }> {
    const assetsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name), ...termQuery(ASSET_TYPE, assetType)],
        },
      },
    });

    const existingAssetLinks = assetsResponse.hits.hits.map((hit) => {
      return fromStorage(hit._source);
    });

    const nextAssetLinks = links.map((link) => {
      return toAssetLink(name, link);
    });

    const nextIds = new Set(nextAssetLinks.map((link) => link[ASSET_UUID]));
    const assetLinksDeleted = existingAssetLinks.filter((link) => !nextIds.has(link[ASSET_UUID]));

    const operations: AssetBulkOperation[] = [
      ...assetLinksDeleted.map((asset) => ({ delete: { asset } })),
      ...nextAssetLinks.map((asset) => ({ index: { asset } })),
    ];

    if (operations.length) {
      await this.bulk(name, operations);
    }

    return {
      deleted: assetLinksDeleted,
      indexed: nextAssetLinks,
    };
  }

  async unlinkAsset(name: string, asset: AssetUnlinkRequest): Promise<void> {
    const id = getAssetLinkUuid(name, asset);

    const { result } = await this.clients.storageClient.delete({ id });
    if (result === 'not_found') {
      throw new AssetNotFoundError(`${asset[ASSET_TYPE]} not found`);
    }
  }

  async clean() {
    await this.clients.storageClient.clean();
  }

  async getAssetLinks<TAssetType extends AssetType>(
    name: string,
    assetTypes?: TAssetType[]
  ): Promise<Array<Extract<AssetLink, { [ASSET_TYPE]: TAssetType }>>> {
    const filters = [...termQuery(STREAM_NAME, name)];
    if (assetTypes?.length) {
      filters.push(...termsQuery(ASSET_TYPE, assetTypes));
    }

    const assetsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
    });

    return assetsResponse.hits.hits.map(
      (hit) => fromStorage(hit._source) as Extract<AssetLink, { [ASSET_TYPE]: TAssetType }>
    );
  }

  async bulkGetByIds<TAssetType extends AssetType>(
    name: string,
    assetType: TAssetType,
    ids: string[]
  ) {
    const assetsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(STREAM_NAME, name),
            ...termQuery(ASSET_TYPE, assetType),
            ...termsQuery(
              '_id',
              ids.map((id) => getAssetLinkUuid(name, { [ASSET_TYPE]: assetType, [ASSET_ID]: id }))
            ),
          ],
        },
      },
    });

    return assetsResponse.hits.hits.map(
      (hit) => fromStorage(hit._source) as Extract<AssetLink, { [ASSET_TYPE]: TAssetType }>
    );
  }

  async bulk(name: string, operations: AssetBulkOperation[]) {
    return await this.clients.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = toStorage(name, Object.values(operation)[0].asset as AssetLinkRequest);
          return {
            index: {
              document,
              _id: document[ASSET_UUID],
            },
          };
        }

        const id = getAssetLinkUuid(name, operation.delete.asset);
        return {
          delete: {
            _id: id,
          },
        };
      }),
    });
  }

  async getAssets(name: string): Promise<Asset[]> {
    const assetLinks = await this.getAssetLinks(name);

    if (!assetLinks.length) {
      return [];
    }

    const [queryAssetLinks, savedObjectAssetLinks] = partition(
      assetLinks,
      (link): link is QueryLink => link[ASSET_TYPE] === 'query'
    );

    const idsByType = Object.fromEntries(
      Object.values(ASSET_TYPES).map((type) => [type, [] as string[]])
    ) as Record<AssetType, string[]>;

    savedObjectAssetLinks.forEach((assetLink) => {
      const assetType = assetLink['asset.type'] as AssetType;
      const assetId = assetLink['asset.id'];
      idsByType[assetType].push(assetId);
    });

    const limiter = pLimit(10);

    const [dashboards, rules, slos] = await Promise.all([
      idsByType.dashboard.length
        ? this.clients.soClient
            .bulkGet<{ title: string }>(
              idsByType.dashboard.map((dashboardId) => ({ type: 'dashboard', id: dashboardId }))
            )
            .then((response) => {
              const dashboardsById = keyBy(response.saved_objects, 'id');

              return idsByType.dashboard.flatMap((dashboardId) => {
                const dashboard = dashboardsById[dashboardId];
                if (dashboard && !dashboard.error) {
                  return [dashboardSavedObjectToAsset(dashboardId, dashboard)];
                }
                return [];
              });
            })
        : [],
      Promise.all(
        idsByType.rule.map((ruleId) => {
          return limiter(() =>
            this.clients.rulesClient.get({ id: ruleId }).then((rule) => {
              return ruleToAsset(ruleId, rule);
            })
          );
        })
      ),
      idsByType.slo.length
        ? this.clients.soClient
            .find<{ name: string; tags: string[] }>({
              type: 'slo',
              filter: `slo.attributes.id:(${idsByType.slo
                .map((sloId) => `"${sloId}"`)
                .join(' OR ')})`,
              perPage: idsByType.slo.length,
            })
            .then((soResponse) => {
              const sloDefinitionsById = keyBy(soResponse.saved_objects, 'slo.attributes.id');

              return idsByType.slo.flatMap((sloId) => {
                const sloDefinition = sloDefinitionsById[sloId];
                if (sloDefinition && !sloDefinition.error) {
                  return [sloSavedObjectToAsset(sloId, sloDefinition)];
                }
                return [];
              });
            })
        : [],
    ]);

    const savedObjectAssetsWithUuids = [...dashboards, ...rules, ...slos].map((asset) => {
      return {
        ...asset,
        [ASSET_UUID]: getAssetLinkUuid(name, asset),
      };
    });

    return [
      ...savedObjectAssetsWithUuids,
      ...queryAssetLinks.map((link): QueryAsset => {
        return {
          [ASSET_ID]: link[ASSET_ID],
          [ASSET_UUID]: link[ASSET_UUID],
          [ASSET_TYPE]: link[ASSET_TYPE],
          query: link.query,
          title: link.query.title,
        };
      }),
    ];
  }

  async getSuggestions({
    query,
    assetTypes,
    tags,
  }: {
    query: string;
    assetTypes?: AssetType[];
    tags?: string[];
  }): Promise<{ hasMore: boolean; assets: AssetWithoutUuid[] }> {
    const perPage = 101;

    const searchAll = !assetTypes;

    const searchDashboardsOrSlos =
      searchAll || assetTypes.includes('dashboard') || assetTypes.includes('slo');

    const searchRules = searchAll || assetTypes.includes('rule');

    const [suggestionsFromSlosAndDashboards, suggestionsFromRules] = await Promise.all([
      searchDashboardsOrSlos
        ? this.clients.soClient
            .find({
              type: ['dashboard' as const, 'slo' as const].filter(
                (type) => searchAll || assetTypes.includes(type)
              ),
              search: query,
              perPage,
              ...(tags
                ? {
                    hasReferenceOperator: 'OR',
                    hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
                  }
                : {}),
            })
            .then((results) => {
              return results.saved_objects.map((savedObject) => {
                if (savedObject.type === 'slo') {
                  const sloSavedObject = savedObject as SavedObject<{
                    id: string;
                    name: string;
                    tags: string[];
                  }>;
                  return sloSavedObjectToAsset(sloSavedObject.attributes.id, sloSavedObject);
                }

                const dashboardSavedObject = savedObject as SavedObject<{
                  title: string;
                }>;

                return dashboardSavedObjectToAsset(dashboardSavedObject.id, dashboardSavedObject);
              });
            })
        : Promise.resolve([]),
      searchRules
        ? this.clients.rulesClient
            .find({
              options: {
                perPage,
                ...(tags
                  ? {
                      hasReferenceOperator: 'OR',
                      hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
                    }
                  : {}),
              },
            })
            .then((results) => {
              return results.data.map((rule) => {
                return ruleToAsset(rule.id, rule);
              });
            })
        : Promise.resolve([]),
    ]);

    return {
      assets: [...suggestionsFromRules, ...suggestionsFromSlosAndDashboards],
      hasMore:
        Math.max(suggestionsFromSlosAndDashboards.length, suggestionsFromRules.length) >
        perPage - 1,
    };
  }
}
