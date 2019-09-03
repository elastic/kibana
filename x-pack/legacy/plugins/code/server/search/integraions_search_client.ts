/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Document,
  IntegrationsSearchResult,
  ResolveSnippetsIntegrationRequest,
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

  public async resolveSnippets(
    req: ResolveSnippetsIntegrationRequest
  ): Promise<IntegrationsSearchResult> {
    const { repoUri, filePath, lineNumStart, lineNumEnd } = req;
    const index = DocumentSearchIndexWithScope([repoUri]);

    const rawRes = await this.client.search({
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

    const hits: any[] = rawRes.hits.hits;
    const results: SearchResultItem[] = hits.map(hit => {
      const doc: Document = hit._source;
      const { path, language } = doc;

      const sourceContent = this.getSnippetContent(doc, lineNumStart, lineNumEnd);
      const item: SearchResultItem = {
        uri: repoUri,
        filePath: path,
        language: language!,
        hits: 1,
        compositeContent: sourceContent,
      };
      return item;
    });
    const total = rawRes.hits.total.value;
    return {
      results,
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
