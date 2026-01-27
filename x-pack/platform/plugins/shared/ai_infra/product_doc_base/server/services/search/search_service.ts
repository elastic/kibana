/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ResourceTypes, getSecurityLabsIndexName } from '@kbn/product-doc-common';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { getIndicesForResourceTypes, mapResult } from './utils';
import { performSearch, performSecurityLabsSearch } from './perform_search';
import type { DocSearchOptions, DocSearchResponse } from './types';

const SECURITY_LABS_BASE_URL = 'https://www.elastic.co/security-labs/';

interface SecurityLabsAttributes {
  title: string;
  slug: string;
  content?: string | { text: string };
}

const isSecurityLabsHit = (
  hit: SearchHit<unknown>
): hit is SearchHit<SecurityLabsAttributes> & { _source: SecurityLabsAttributes } => {
  return Boolean(hit._source && typeof hit._source === 'object' && 'title' in hit._source);
};

const mapSecurityLabsResult = (docHit: SearchHit<SecurityLabsAttributes>) => {
  const source = docHit._source!;
  const content = source.content;
  return {
    title: source.title,
    content: typeof content === 'string' ? content : content?.text ?? '',
    url: `${SECURITY_LABS_BASE_URL}${source.slug}`,
    productName: 'security' as const,
    highlights:
      (docHit.highlight as Record<string, string[] | undefined> | undefined)?.content ?? [],
  };
};

export class SearchService {
  private readonly log: Logger;
  private readonly esClient: ElasticsearchClient;

  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.log = logger;
    this.esClient = esClient;
  }

  async search(options: DocSearchOptions): Promise<DocSearchResponse> {
    const { query, max = 3, highlights = 3, products, inferenceId } = options;
    const resourceTypes = options.resourceTypes ?? [ResourceTypes.productDoc];

    const results: Array<SearchHit<unknown>> = [];

    if (resourceTypes.includes(ResourceTypes.productDoc)) {
      const productDocIndex = getIndicesForResourceTypes(products, inferenceId, [
        ResourceTypes.productDoc,
      ]);
      this.log.debug(
        `performing search - query=[${query}] at index=[${productDocIndex}] resourceType=[${ResourceTypes.productDoc}]`
      );
      results.push(
        ...(await performSearch({
          searchQuery: query,
          size: max,
          highlights,
          index: productDocIndex,
          client: this.esClient,
        }))
      );
    }

    if (resourceTypes.includes(ResourceTypes.securityLabs)) {
      const securityLabsIndex = getSecurityLabsIndexName(inferenceId);
      this.log.debug(
        `performing search - query=[${query}] at index=[${securityLabsIndex}] resourceType=[${ResourceTypes.securityLabs}]`
      );
      results.push(
        ...(await performSecurityLabsSearch({
          searchQuery: query,
          size: max,
          highlights,
          index: securityLabsIndex,
          client: this.esClient,
        }))
      );
    }

    const sorted = results
      .slice()
      .sort((a, b) => (b._score ?? 0) - (a._score ?? 0))
      .slice(0, max);

    return {
      results: sorted.map((hit) => {
        if (isSecurityLabsHit(hit)) {
          return mapSecurityLabsResult(hit);
        }
        return mapResult(hit as any);
      }),
    };
  }
}
