/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IScopedClusterClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { isEmpty, compact, orderBy, sumBy, get } from 'lodash';
import { encode, decode } from 'gpt-tokenizer';
import { ProductDocumentationAttributes } from '@kbn/product-doc-common';
import { DocSearchResult } from '@kbn/product-doc-base-plugin/server';
import type {
  GetConnectorsResponse,
  KnowledgeBaseConnector,
  KnowledgeBaseHit,
  KnowledgeBaseQueryContainer,
  KnowledgeBaseSource,
  KnowledgeBaseStatus,
} from './types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { getElserModelStatus } from '../inference_endpoint';
import { ObservabilityAIAssistantConfig } from '../../config';
import { resourceNames } from '..';
import {
  KnowledgeBaseEntry,
  KnowledgeBaseType,
  aiAssistantSearchConnectorIndexPattern,
} from '../../../common';
import { getAccessQuery } from '../util/get_access_query';
import {
  formatKnowledgeBaseTextQueries,
  getSparseVectorFieldsQuery,
  getTextFieldsQuery,
  wrapExistingQuery,
} from './get_queries';

interface KnowledgeBaseClientDependencies {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  user: {
    id?: string;
    name: string;
  } | null;
  spaceId: string;
  scopedClusterClient: IScopedClusterClient;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  pluginsStart: Pick<ObservabilityAIAssistantPluginStartDependencies, 'productDocBase'>;
  config: ObservabilityAIAssistantConfig;
}

function getHighlights(fields: string[]) {
  return {
    fields: Object.fromEntries(fields.map((field) => [field, {}])),
  };
}

export class KnowledgeBaseClient {
  constructor(private readonly dependencies: KnowledgeBaseClientDependencies) {}

  private async searchInternalKnowledgeBase({
    queries,
    ...request
  }: {
    queries: KnowledgeBaseQueryContainer[];
  } & SearchRequest): Promise<SearchResponse<KnowledgeBaseEntry>> {
    const formattedRequest = {
      ...request,
      query: formatKnowledgeBaseTextQueries({
        queries,
        query: {
          bool: {
            filter: [
              ...getAccessQuery({
                user: this.dependencies.user,
                namespace: this.dependencies.spaceId,
              }),
            ],
            ...(request.query
              ? {
                  must: request.query,
                }
              : {}),
            must_not: [
              {
                term: {
                  type: KnowledgeBaseType.UserInstruction,
                },
              },
            ],
          },
        },
        textFields: ['semantic_text'],
      }),
      index: resourceNames.aliases.kb,
      highlight: getHighlights(['semantic_text']),
    };

    return this.dependencies.scopedClusterClient.asInternalUser.search<KnowledgeBaseEntry>(
      formattedRequest
    );
  }

  private async searchProductDocIndices({
    queries,
    ...request
  }: {
    queries: KnowledgeBaseQueryContainer[];
  } & SearchRequest) {
    const productDocIndexPattern = this.dependencies.pluginsStart.productDocBase.getIndexPattern();

    const { query, highlight } = await getTextFieldsQuery({
      client: this.dependencies.scopedClusterClient.asInternalUser,
      indexPattern: this.dependencies.pluginsStart.productDocBase.getIndexPattern(),
      queries,
    });

    const formattedRequest = {
      ...request,
      query: query ? wrapExistingQuery(request.query, { should: [query] }) : request.query,
      index: productDocIndexPattern,
      highlight,
    };

    return this.dependencies.scopedClusterClient.asInternalUser.search<ProductDocumentationAttributes>(
      formattedRequest
    );
  }

  private async searchConnectorIndices({
    queries,
    ...request
  }: {
    queries: KnowledgeBaseQueryContainer[];
  } & SearchRequest) {
    const { connectors = [], indexPattern } = await this.getConnectors();

    const [text, sparseVector] = await Promise.all([
      getTextFieldsQuery({
        client: this.dependencies.scopedClusterClient.asCurrentUser,
        indexPattern,
        queries,
      }),
      getSparseVectorFieldsQuery({
        client: this.dependencies.scopedClusterClient.asCurrentUser,
        core: this.dependencies.core,
        logger: this.dependencies.logger,
        indexPattern,
        queries,
      }),
    ]);

    const clauses = compact([text.query, sparseVector.query]);

    const formattedRequest = {
      ...request,
      query: wrapExistingQuery(request.query, {
        should: clauses,
      }),
      index: indexPattern,
      highlight: {
        ...text.highlight,
        ...sparseVector.highlight,
      },
    };

    return this.dependencies.scopedClusterClient.asCurrentUser
      .search<unknown>(formattedRequest)
      .then((response) => {
        return {
          response,
          connectors,
        };
      });
  }

  async getConnectors(): Promise<GetConnectorsResponse> {
    // improve performance by running this in parallel with the `uiSettingsClient` request
    const responsePromise: Promise<KnowledgeBaseConnector[]> =
      this.dependencies.scopedClusterClient.asInternalUser.connector
        .list()
        .then(({ results }) => {
          return results.map((result): KnowledgeBaseConnector => {
            return {
              id: result.id!,
              description: result.description ?? '',
              name: result.name!,
              service_type: result.service_type ?? 'unknown',
              status: result.status!,
              index_name: result.index_name,
            };
          });
        })
        .catch((e) => {
          this.dependencies.logger.warn(`Failed to fetch connector indices due to ${e.message}`);
          return [];
        });

    const customSearchConnectorIndex = await this.dependencies.uiSettingsClient.get<string>(
      aiAssistantSearchConnectorIndexPattern
    );

    if (customSearchConnectorIndex) {
      return {
        indexPattern: customSearchConnectorIndex.split(','),
      };
    }

    const connectors = await responsePromise;

    // preserve backwards compatibility with 8.14 (may not be needed in the future)
    if (isEmpty(connectors)) {
      return {
        indexPattern: ['search-*'],
      };
    }

    return {
      connectors,
      indexPattern: compact(connectors.map((connector) => connector.index_name)),
    };
  }

  async status(): Promise<KnowledgeBaseStatus> {
    if (!this.dependencies.config.enableKnowledgeBase) {
      return {
        enabled: false,
      };
    }

    const checkForHitsRequestParams = {
      terminate_after: 1,
      timeout: '1ms',
      track_total_hits: 1,
      size: 0,
      queries: [],
    };

    function getHasHitsFromResponse(response: SearchResponse) {
      return (response.hits.total as { value: number }).value > 0;
    }

    const [productDocAvailable, inferenceModelStats, [internalHasDocs, connectorsHasDocs]] =
      await Promise.all([
        this.dependencies.pluginsStart.productDocBase.management
          .getStatus()
          .then(({ status }) => status === 'installed'),
        getElserModelStatus({
          esClient: this.dependencies.scopedClusterClient,
          logger: this.dependencies.logger,
        }),
        Promise.all([
          this.searchInternalKnowledgeBase(checkForHitsRequestParams)
            .then((response) => getHasHitsFromResponse(response))
            .catch((error) => {
              this.dependencies.logger.debug(
                `Failed to fetch from internal KB index: ${error.message}`
              );
              return false;
            }),
          this.searchConnectorIndices(checkForHitsRequestParams)
            .then(({ response }) => getHasHitsFromResponse(response))
            .catch((error) => {
              this.dependencies.logger.debug(
                `Failed to fetch from connector indices: ${error.message}`
              );
              return false;
            }),
        ]),
      ]);

    return {
      enabled: true,
      has_any_docs: productDocAvailable || internalHasDocs || connectorsHasDocs,
      internal: inferenceModelStats,
      product_documentation: {
        available: productDocAvailable,
      },
    };
  }

  async recall({
    queries,
    limit = {},
  }: {
    queries: KnowledgeBaseQueryContainer[];
    limit?: { size?: number; tokenCount?: number };
  }): Promise<KnowledgeBaseHit[]> {
    const defaultSize = 20;

    const size = limit.tokenCount !== undefined ? undefined : limit.size ?? defaultSize;

    const requestSize = size ?? defaultSize;

    const tokenCount = limit.tokenCount;

    this.dependencies.logger.debug(
      () => `Recalling entries from KB for queries: "${JSON.stringify(queries)}"`
    );

    const [internalKbEntries, productDocEntries, connectorEntries] = await Promise.allSettled([
      this.searchInternalKnowledgeBase({
        queries,
        size: requestSize,
      }).then((response) => {
        return response.hits.hits.map((hit) => {
          return {
            id: hit._id!,
            title: hit._source?.title,
            score: hit._score!,
            document: hit._source!,
            text: hit._source!.text,
            source: {
              internal: {},
            },
          };
        });
      }),
      this.searchProductDocIndices({
        queries,
        size: requestSize,
      }).then((response) => {
        return response.hits.hits.map((result) => {
          const source = result._source!;

          const document: Omit<DocSearchResult, 'highlights'> & { score: number } = {
            content:
              typeof source.content_body === 'string'
                ? source.content_body
                : source.content_body.text,
            title: source.content_title,
            url: source.url,
            productName: source.product_name,
            score: result._score!,
          };
          return {
            id: document.url,
            title: document.title,
            score: document.score,
            document,
            source: {
              product_documentation: {},
            },
          };
        });
      }),
      this.searchConnectorIndices({
        queries,
        size: requestSize,
      }).then(({ connectors, response }) => {
        const connectorsByIndex = new Map(
          connectors
            .filter((connector) => connector.index_name)
            .map((connector) => [connector.index_name, connector])
        );

        return response.hits.hits.map((hit) => {
          const connector = connectorsByIndex.get(hit._index);
          const score = hit._score!;
          const document = hit._source!;

          let title = get(document, 'title') || get(document, 'name');

          if (typeof title !== 'string') {
            title = undefined;
          }

          if (connector) {
            return {
              id: hit._id!,
              title,
              score,
              document,
              source: {
                connector,
              },
            };
          }
          return {
            id: hit._id!,
            title,
            score,
            document,
            source: {
              index: {
                name: hit._index,
              },
            },
          };
        });
      }),
    ]);

    const getEntriesOrLogError = <T>(name: string, result: PromiseSettledResult<T>) => {
      if (result.status === 'rejected') {
        this.dependencies.logger.debug(`Failed to retrieve entries from ${name}: ${result.reason}`);
        if (result.reason instanceof Error) {
          this.dependencies.logger.debug(() => result.reason.stack!);
        }
        return [];
      }
      return result.value;
    };

    const allEntries = [
      ...getEntriesOrLogError('internal', internalKbEntries),
      ...getEntriesOrLogError('product documentation', productDocEntries),
      ...getEntriesOrLogError('connectors', connectorEntries),
    ];

    const sortedEntries = serializeHits(
      orderBy(allEntries, (entry) => entry.score, 'desc').slice(0, requestSize)
    );

    function serializeHits<
      T extends {
        text?: string;
        id: string;
        title?: string;
        document: unknown;
        source: KnowledgeBaseSource;
      }
    >(hits: T[]): Array<T & { text: string; title: string }> {
      return hits.map((hit) => {
        const sourceId =
          'index' in hit.source
            ? hit.source.index.name
            : 'connector' in hit.source
            ? hit.source.connector.name
            : 'internal' in hit.source
            ? 'internal'
            : 'product_documentation';

        const text = 'text' in hit && hit.text ? hit.text : JSON.stringify(hit.document);

        const title = hit.title || text;

        return {
          ...hit,
          text,
          title: title.length > 100 ? `${title.substring(0, 100)}...` : title,
          id: `${sourceId}/${hit.id}`,
        };
      });
    }

    if (size !== undefined) {
      return sortedEntries;
    }

    const maxTokenCount = tokenCount ?? Number.MAX_VALUE;

    const entriesWithTokens = sortedEntries.map((entry) => {
      const encoded = encode(entry.text);
      return {
        entry,
        tokens: encoded,
        tokenCount: encoded.length,
      };
    });

    const totalTokenCount = sumBy(entriesWithTokens, (entry) => entry.tokenCount);

    if (totalTokenCount <= maxTokenCount) {
      return sortedEntries;
    }

    const truncateAfter = Math.floor(maxTokenCount / entriesWithTokens.length);

    return entriesWithTokens.map(({ entry, tokenCount: entryTokenCount, tokens: entryTokens }) => {
      if (entryTokenCount > truncateAfter) {
        const truncatedTokens = entryTokens.slice(0, truncateAfter);
        return {
          ...entry,
          truncated: {
            truncatedText: `${decode(truncatedTokens)}... <truncated>`,
            originalTokenCount: entryTokenCount,
            truncatedTokenCount: truncatedTokens.length,
          },
        };
      }
      return entry;
    });
  }
}
