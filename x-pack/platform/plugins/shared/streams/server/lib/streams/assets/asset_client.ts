/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { IStorageClient } from '@kbn/storage-adapter';
import objectHash from 'object-hash';
import type {
  Asset,
  AssetLink,
  AssetLinkRequest,
  AssetUnlinkRequest,
  AssetType,
  QueryLink,
} from '../../../../common/assets';
import { QUERY_KQL_BODY, QUERY_FEATURE_FILTER, QUERY_FEATURE_NAME, QUERY_TITLE } from './fields';
import { ASSET_ID, ASSET_TYPE, ASSET_UUID, STREAM_NAME } from './fields';
import type { AssetStorageSettings } from './storage_settings';
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

type StoredQueryLink = Omit<QueryLink, 'query'> & {
  [QUERY_TITLE]: string;
  [QUERY_KQL_BODY]: string;
};

export type StoredAssetLink = StoredQueryLink & {
  [STREAM_NAME]: string;
};

interface AssetBulkIndexOperation {
  index: { asset: AssetLinkRequest };
}
interface AssetBulkDeleteOperation {
  delete: { asset: AssetUnlinkRequest };
}

function fromStorage(link: StoredAssetLink): AssetLink {
  const storedQueryLink: StoredQueryLink & {
    [QUERY_FEATURE_NAME]: string;
    [QUERY_FEATURE_FILTER]: string;
  } = link as any;
  return {
    ...storedQueryLink,
    query: {
      id: storedQueryLink[ASSET_ID],
      title: storedQueryLink[QUERY_TITLE],
      kql: {
        query: storedQueryLink[QUERY_KQL_BODY],
      },
      feature: storedQueryLink[QUERY_FEATURE_NAME]
        ? {
            name: storedQueryLink[QUERY_FEATURE_NAME],
            filter: JSON.parse(storedQueryLink[QUERY_FEATURE_FILTER]),
          }
        : undefined,
    },
  } satisfies QueryLink;
}

function toStorage(name: string, request: AssetLinkRequest): StoredAssetLink {
  const link = toAssetLink(name, request);
  const { query, ...rest } = link;
  return {
    ...rest,
    [STREAM_NAME]: name,
    [QUERY_TITLE]: query.title,
    [QUERY_KQL_BODY]: query.kql.query,
    [QUERY_FEATURE_NAME]: query.feature ? query.feature.name : '',
    [QUERY_FEATURE_FILTER]: query.feature ? JSON.stringify(query.feature.filter) : '',
  } as unknown as StoredAssetLink;
}

export type AssetBulkOperation = AssetBulkIndexOperation | AssetBulkDeleteOperation;

export class AssetClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<AssetStorageSettings, StoredAssetLink>;
      soClient: SavedObjectsClientContract;
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
    names: string[],
    assetTypes?: TAssetType[]
  ): Promise<Record<string, Array<Extract<AssetLink, { [ASSET_TYPE]: TAssetType }>>>> {
    const filters = [...termsQuery(STREAM_NAME, names)];
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

    const assetsPerName = names.reduce((acc, name) => {
      acc[name] = [];
      return acc;
    }, {} as Record<string, Array<Extract<AssetLink, { [ASSET_TYPE]: TAssetType }>>>);

    assetsResponse.hits.hits.forEach((hit) => {
      const name = hit._source[STREAM_NAME];
      const asset = fromStorage(hit._source) as Extract<AssetLink, { [ASSET_TYPE]: TAssetType }>;
      assetsPerName[name].push(asset);
    });

    return assetsPerName;
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
    const { [name]: assetLinks } = await this.getAssetLinks([name]);

    if (assetLinks.length === 0) {
      return [];
    }

    return assetLinks
      .filter((link): link is QueryLink => link[ASSET_TYPE] === 'query')
      .map((link) => {
        return {
          [ASSET_ID]: link[ASSET_ID],
          [ASSET_UUID]: link[ASSET_UUID],
          [ASSET_TYPE]: link[ASSET_TYPE],
          query: link.query,
          title: link.query.title,
        };
      });
  }
}
