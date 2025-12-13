/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isBoom } from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { FeatureType, StreamQuery } from '@kbn/streams-schema';
import { buildEsqlQuery } from '@kbn/streams-schema';
import { isEqual, map, partition } from 'lodash';
import pLimit from 'p-limit';
import objectHash from 'object-hash';
import {
  QUERY_ASSET_TYPE,
  type SignificantEvent,
  type SignificantEventLink,
  type SignificantEventLinkRequest,
} from '../../../../common/significant_events';
import type { EsqlRuleParams } from '../../rules/esql/types';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  STREAM_NAME,
  QUERY_KQL_BODY,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  QUERY_FEATURE_TYPE,
  QUERY_TITLE,
  QUERY_SEVERITY_SCORE,
  QUERY_EVIDENCE,
} from '../assets/fields';
import type { AssetStorageSettings } from '../assets/storage_settings';
import { getRuleIdFromQueryLink } from '../assets/query/helpers/query';

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

export function getSignificantEventLinkUuid(
  name: string,
  event: Pick<SignificantEventLink, 'asset.id' | 'asset.type'>
) {
  return objectHash({
    [STREAM_NAME]: name,
    [ASSET_ID]: event[ASSET_ID],
    [ASSET_TYPE]: event[ASSET_TYPE],
  });
}

function toSignificantEventLink<TEventLink extends SignificantEventLinkRequest>(
  name: string,
  event: TEventLink
): TEventLink & { [ASSET_UUID]: string } {
  return {
    ...event,
    [ASSET_UUID]: getSignificantEventLinkUuid(name, event),
  };
}

type StoredQueryLink = Omit<SignificantEventLink, 'query'> & {
  [QUERY_TITLE]: string;
  [QUERY_KQL_BODY]: string;
  [QUERY_SEVERITY_SCORE]?: number;
};

export type StoredSignificantEventLink = StoredQueryLink & {
  [STREAM_NAME]: string;
};

function fromStorage(link: StoredSignificantEventLink): SignificantEventLink {
  const storedQueryLink: StoredQueryLink & {
    [QUERY_FEATURE_NAME]: string;
    [QUERY_FEATURE_FILTER]: string;
    [QUERY_FEATURE_TYPE]: FeatureType;
    [QUERY_EVIDENCE]?: string[];
  } = link as unknown as StoredQueryLink & {
    [QUERY_FEATURE_NAME]: string;
    [QUERY_FEATURE_FILTER]: string;
    [QUERY_FEATURE_TYPE]: FeatureType;
    [QUERY_EVIDENCE]?: string[];
  };
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
            type: storedQueryLink[QUERY_FEATURE_TYPE] ?? 'system',
          }
        : undefined,
      severity_score: storedQueryLink[QUERY_SEVERITY_SCORE],
      evidence: storedQueryLink[QUERY_EVIDENCE],
    },
  } satisfies SignificantEventLink;
}

function toStorage(name: string, request: SignificantEventLinkRequest): StoredSignificantEventLink {
  const link = toSignificantEventLink(name, request);
  const { query, ...rest } = link;
  return {
    ...rest,
    [STREAM_NAME]: name,
    [QUERY_TITLE]: query.title,
    [QUERY_KQL_BODY]: query.kql.query,
    [QUERY_FEATURE_NAME]: query.feature ? query.feature.name : '',
    [QUERY_FEATURE_FILTER]: query.feature ? JSON.stringify(query.feature.filter) : '',
    [QUERY_FEATURE_TYPE]: query.feature ? query.feature.type : '',
    [QUERY_SEVERITY_SCORE]: query.severity_score,
    [QUERY_EVIDENCE]: query.evidence,
  } as unknown as StoredSignificantEventLink;
}

export class SignificantEventsClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<AssetStorageSettings, StoredSignificantEventLink>;
      soClient: SavedObjectsClientContract;
      rulesClient?: RulesClient;
      logger?: Logger;
    },
    private readonly isSignificantEventsEnabled: boolean = false
  ) {}

  private async syncSignificantEventList(
    name: string,
    links: SignificantEventLinkRequest[]
  ): Promise<{ deleted: SignificantEventLink[]; indexed: SignificantEventLink[] }> {
    const eventsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name), ...termQuery(ASSET_TYPE, QUERY_ASSET_TYPE)],
        },
      },
    });

    const existingEventLinks = eventsResponse.hits.hits.map((hit) => {
      return fromStorage(hit._source);
    });

    const nextEventLinks = links.map((link) => {
      return toSignificantEventLink(name, link);
    });

    const nextIds = new Set(nextEventLinks.map((link) => link[ASSET_UUID]));
    const eventLinksDeleted = existingEventLinks.filter((link) => !nextIds.has(link[ASSET_UUID]));

    const operations = [
      ...eventLinksDeleted.map((event) => ({
        delete: {
          _id: getSignificantEventLinkUuid(name, event),
        },
      })),
      ...nextEventLinks.map((event) => ({
        index: {
          document: toStorage(name, event),
          _id: event[ASSET_UUID],
        },
      })),
    ];

    if (operations.length) {
      await this.clients.storageClient.bulk({ operations, throwOnFail: true });
    }

    return {
      deleted: eventLinksDeleted,
      indexed: nextEventLinks,
    };
  }

  async clean() {
    await this.clients.storageClient.clean();
  }

  async getSignificantEventLinks(names: string[]): Promise<Record<string, SignificantEventLink[]>> {
    const filters = [...termsQuery(STREAM_NAME, names)];
    filters.push(...termsQuery(ASSET_TYPE, [QUERY_ASSET_TYPE]));

    const eventsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
    });

    const eventsPerName = names.reduce((acc, name) => {
      acc[name] = [];
      return acc;
    }, {} as Record<string, SignificantEventLink[]>);

    eventsResponse.hits.hits.forEach((hit) => {
      const name = hit._source[STREAM_NAME];
      const event = fromStorage(hit._source);
      eventsPerName[name].push(event);
    });

    return eventsPerName;
  }

  async getByIds(name: string, ids: string[]) {
    const eventsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(STREAM_NAME, name),
            ...termQuery(ASSET_TYPE, QUERY_ASSET_TYPE),
            ...termsQuery(
              '_id',
              ids.map((id) =>
                getSignificantEventLinkUuid(name, {
                  [ASSET_TYPE]: QUERY_ASSET_TYPE,
                  [ASSET_ID]: id,
                })
              )
            ),
          ],
        },
      },
    });

    return eventsResponse.hits.hits.map((hit) => fromStorage(hit._source));
  }

  async list(name: string): Promise<SignificantEvent[]> {
    const { [name]: eventLinks } = await this.getSignificantEventLinks([name]);

    if (eventLinks.length === 0) {
      return [];
    }

    return eventLinks.map((link) => {
      return {
        [ASSET_ID]: link[ASSET_ID],
        [ASSET_UUID]: link[ASSET_UUID],
        [ASSET_TYPE]: link[ASSET_TYPE],
        query: link.query,
        title: link.query.title,
      };
    });
  }

  // Query/Significant Events Management Methods

  public async sync(stream: string, queries: StreamQuery[]) {
    if (!this.isSignificantEventsEnabled) {
      this.clients.logger?.debug(
        `Skipping sync for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    /**
     * This method is used to synchronize queries/rules for a stream.
     * It manages the rules associated with these queries, ensuring that any query breaking changes
     * are handled appropriately:
     * - If a query is new, it creates a new rule.
     * - If a query is updated with a breaking change, it removes the old rule and creates a new one.
     * - If a query is updated without a breaking change, it updates the existing rule.
     * - If a query is deleted, it removes the associated rule.
     */
    const { [stream]: currentQueryLinks } = await this.getSignificantEventLinks([stream]);
    const currentIds = new Set(currentQueryLinks.map((link) => link.query.id));
    const nextIds = new Set(queries.map((query) => query.id));

    const nextQueriesToCreate = queries
      .filter((query) => !currentIds.has(query.id))
      .map((query) => this.toQueryLink(query, stream));

    const currentQueriesToDelete = currentQueryLinks.filter((link) => !nextIds.has(link.query.id));

    const currentQueriesToDeleteBeforeUpdate = currentQueryLinks.filter((link) =>
      queries.some(
        (query) => query.id === link.query.id && this.hasBreakingChange(link.query, query)
      )
    );

    const [nextQueriesUpdatedWithBreakingChange, nextQueriesUpdatedWithoutBreakingChange] = map(
      partition(
        queries.filter((query) => currentIds.has(query.id)),
        (query) => {
          const currentLink = currentQueryLinks.find((link) => link.query.id === query.id);
          return this.hasBreakingChange(currentLink!.query, query);
        }
      ),
      (partitionedQueries) => partitionedQueries.map((query) => this.toQueryLink(query, stream))
    );

    await this.uninstallQueries([...currentQueriesToDelete, ...currentQueriesToDeleteBeforeUpdate]);
    await this.installQueries(
      [...nextQueriesToCreate, ...nextQueriesUpdatedWithBreakingChange],
      nextQueriesUpdatedWithoutBreakingChange,
      stream
    );

    await this.syncSignificantEventList(
      stream,
      queries.map((query) => ({
        [ASSET_ID]: query.id,
        [ASSET_TYPE]: QUERY_ASSET_TYPE,
        query,
      }))
    );
  }

  public async upsert(stream: string, query: StreamQuery) {
    if (!this.isSignificantEventsEnabled) {
      this.clients.logger?.debug(
        `Skipping upsert for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    await this.bulk(stream, [{ index: query }]);
  }

  public async delete(stream: string, queryId: string) {
    if (!this.isSignificantEventsEnabled) {
      this.clients.logger?.debug(
        `Skipping delete for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    await this.bulk(stream, [{ delete: { id: queryId } }]);
  }

  public async deleteAll(stream: string) {
    if (!this.isSignificantEventsEnabled) {
      this.clients.logger?.debug(
        `Skipping deleteAll for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentQueryLinks } = await this.getSignificantEventLinks([stream]);
    const queriesToDelete = currentQueryLinks.map((link) => ({ delete: { id: link.query.id } }));
    await this.bulk(stream, queriesToDelete);
  }

  public async bulk(
    stream: string,
    operations: Array<{ index?: StreamQuery; delete?: { id: string } }>
  ) {
    if (!this.isSignificantEventsEnabled) {
      this.clients.logger?.debug(
        `Skipping bulk update for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentQueryLinks } = await this.getSignificantEventLinks([stream]);
    const currentIds = new Set(currentQueryLinks.map((link) => link.query.id));
    const indexOperationsMap = new Map(
      operations
        .filter((operation) => operation.index)
        .map((operation) => [operation.index!.id, operation.index!])
    );
    const deleteOperationIds = new Set(
      operations.filter((operation) => operation.delete).map((operation) => operation.delete!.id)
    );

    const nextQueries = [
      ...currentQueryLinks
        .filter((link) => !deleteOperationIds.has(link.query.id))
        .map((link) => {
          const update = indexOperationsMap.get(link.query.id);
          return update ? { ...link, query: update } : link;
        }),
      ...operations
        .filter((operation) => operation.index && !currentIds.has(operation.index!.id))
        .map((operation) => this.toQueryLink(operation.index!, stream)),
    ];

    await this.sync(
      stream,
      nextQueries.map((link) => link.query)
    );
  }

  private hasBreakingChange(currentQuery: StreamQuery, nextQuery: StreamQuery): boolean {
    return (
      currentQuery.kql.query !== nextQuery.kql.query ||
      !isEqual(currentQuery.feature, nextQuery.feature)
    );
  }

  private toQueryLink(query: StreamQuery, stream: string): SignificantEventLink {
    return {
      'asset.uuid': getSignificantEventLinkUuid(stream, {
        'asset.type': QUERY_ASSET_TYPE,
        'asset.id': query.id,
      }),
      'asset.type': QUERY_ASSET_TYPE,
      'asset.id': query.id,
      query,
    };
  }

  private async installQueries(
    queriesToCreate: SignificantEventLink[],
    queriesToUpdate: SignificantEventLink[],
    stream: string
  ) {
    if (!this.clients.rulesClient) {
      return;
    }

    const { rulesClient } = this.clients;
    const limiter = pLimit(10);

    await Promise.all([
      ...queriesToCreate.map((query) => {
        return limiter(() =>
          rulesClient
            .create<EsqlRuleParams>(this.toCreateRuleParams(query, stream))
            .catch((error) => {
              if (isBoom(error) && error.output.statusCode === 409) {
                return rulesClient.update<EsqlRuleParams>(this.toUpdateRuleParams(query, stream));
              }
              throw error;
            })
        );
      }),
      ...queriesToUpdate.map((query) => {
        return limiter(() =>
          rulesClient
            .update<EsqlRuleParams>(this.toUpdateRuleParams(query, stream))
            .catch((error) => {
              if (isBoom(error) && error.output.statusCode === 404) {
                return rulesClient.create<EsqlRuleParams>(this.toCreateRuleParams(query, stream));
              }
              throw error;
            })
        );
      }),
    ]);
  }

  private async uninstallQueries(queries: SignificantEventLink[]) {
    if (queries.length === 0 || !this.clients.rulesClient) {
      return;
    }

    const { rulesClient } = this.clients;
    await rulesClient
      .bulkDeleteRules({ ids: queries.map(getRuleIdFromQueryLink), ignoreInternalRuleTypes: false })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 400) {
          return;
        }
        throw error;
      });
  }

  private toCreateRuleParams(query: SignificantEventLink, stream: string) {
    const ruleId = getRuleIdFromQueryLink(query);

    const esqlQuery = buildEsqlQuery([stream, `${stream}.*`], query.query, true);
    return {
      data: {
        name: query.query.title,
        consumer: 'streams',
        alertTypeId: 'streams.rules.esql',
        actions: [],
        params: {
          timestampField: '@timestamp',
          query: esqlQuery,
        },
        enabled: true,
        tags: ['streams', stream],
        schedule: {
          interval: '1m',
        },
      },
      options: {
        id: ruleId,
      },
    };
  }

  private toUpdateRuleParams(query: SignificantEventLink, stream: string) {
    const ruleId = getRuleIdFromQueryLink(query);
    const esqlQuery = buildEsqlQuery([stream, `${stream}.*`], query.query, true);
    return {
      id: ruleId,
      data: {
        name: query.query.title,
        actions: [],
        params: {
          timestampField: '@timestamp',
          query: esqlQuery,
        },
        tags: ['streams', stream],
        schedule: {
          interval: '1m',
        },
      },
    };
  }
}
