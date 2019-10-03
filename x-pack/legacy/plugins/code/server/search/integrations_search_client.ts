/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Document,
  IntegrationsSearchResult,
  ResolveSnippetsRequest,
  SearchResultItem,
  SourceHit,
} from '../../model';
import { DocumentSearchIndexWithScope } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { DocumentSearchClient } from './document_search_client';

export class IntegrationsSearchClient extends DocumentSearchClient {
  constructor(protected readonly client: EsClient, protected readonly log: Logger) {
    super(client, log);
  }

  public async resolveSnippets(req: ResolveSnippetsRequest): Promise<IntegrationsSearchResult> {
    const { repoUris, filePath, lineNumStart, lineNumEnd } = req;
    const index = DocumentSearchIndexWithScope(repoUris);

    let fallback = false;
    let rawRes = await this.client.search({
      index,
      body: {
        query: {
          term: {
            'path.keyword': {
              value: filePath,
            },
          },
        },
      },
    });
    if (rawRes.hits.hits.length === 0) {
      // Fall back with match query with gauss score normalization on path length.
      rawRes = await this.client.search({
        index,
        body: {
          query: {
            script_score: {
              query: {
                term: {
                  'path.hierarchy': {
                    value: filePath,
                  },
                },
              },
              script: {
                source:
                  "decayNumericGauss(params.origin, params.scale, params.offset, params.decay, doc['path.keyword'].value.length())",
                params: {
                  origin: filePath.length,
                  scale: 20,
                  offset: 0,
                  decay: 0.8,
                },
              },
            },
          },
        },
      });
      fallback = true;
    }

    const total = rawRes.hits.total.value;
    const hits: any[] = rawRes.hits.hits;
    const results: SearchResultItem[] = hits.map(hit => {
      const doc: Document = hit._source;
      const { repoUri: uri, path, language } = doc;

      const sourceContent = this.getSnippetContent(doc, lineNumStart, lineNumEnd);
      const item: SearchResultItem = {
        uri,
        filePath: path,
        language: language!,
        hits: 1,
        compositeContent: sourceContent,
      };
      return item;
    });

    return {
      results,
      fallback,
      took: rawRes.took,
      total,
    };
  }

  private getSnippetContent(doc: Document, lineNumStart: number, lineNumEnd?: number) {
    const hit: SourceHit = {
      range: {
        startLoc: {
          line: lineNumStart - 1,
          column: 0,
          offset: 0,
        },
        endLoc: {
          line: lineNumEnd === undefined ? lineNumStart - 1 : lineNumEnd - 1,
          column: 0,
          offset: 0,
        },
      },
      score: 0,
      term: '',
    };

    return super.getSourceContent([hit], doc);
  }
}
