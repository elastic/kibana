/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { CATALOG_INDEX_NAME } from './constants';
import type { DataSourceEntry, CatalogQueryParams, CatalogQueryResult } from './types';

export class CatalogQuery {
  constructor(private readonly esClient: ElasticsearchClient) {}

  async search(params: CatalogQueryParams): Promise<CatalogQueryResult> {
    const {
      namePattern,
      type,
      integrationPackage,
      hasFields,
      searchText,
      activeOnly,
      size = 10,
    } = params;

    const filter: QueryDslQueryContainer[] = [];
    const should: QueryDslQueryContainer[] = [];

    if (namePattern) {
      filter.push({ wildcard: { name: { value: namePattern } } });
    }

    if (type) {
      filter.push({ term: { type } });
    }

    if (integrationPackage) {
      filter.push({ term: { 'integration.package_name': integrationPackage } });
    }

    if (hasFields && hasFields.length > 0) {
      for (const fieldName of hasFields) {
        filter.push({
          nested: {
            path: 'mapping.fields',
            query: { term: { 'mapping.fields.name': fieldName } },
          },
        });
      }
    }

    if (activeOnly) {
      filter.push({ term: { 'stats.is_active': true } });
    }

    if (searchText) {
      should.push({
        multi_match: {
          query: searchText,
          fields: ['name.text', 'integration.description', 'semantic.summary'],
          type: 'best_fields',
        },
      });
    }

    const query: QueryDslQueryContainer = {
      bool: {
        ...(filter.length > 0 ? { filter } : {}),
        ...(should.length > 0 ? { should, minimum_should_match: searchText ? 1 : 0 } : {}),
      },
    };

    const result = await this.esClient.search<DataSourceEntry>({
      index: CATALOG_INDEX_NAME,
      query,
      size,
    });

    const total =
      typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;

    const entries = result.hits.hits
      .map((hit) => hit._source)
      .filter((source): source is DataSourceEntry => source != null);

    return { entries, total };
  }
}
