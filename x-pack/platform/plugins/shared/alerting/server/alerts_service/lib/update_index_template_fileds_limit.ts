/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';

export const updateIndexTemplateFiledsLimit = ({
  esClient,
  template,
  limit,
}: {
  esClient: ElasticsearchClient;
  template: IndicesGetIndexTemplateIndexTemplateItem;
  limit: number;
}) => {
  return esClient.indices.putIndexTemplate({
    name: template.name,
    body: {
      ...template.index_template,
      // @ts-expect-error elasticsearch@9.0.0 https://github.com/elastic/elasticsearch-js/issues/2584
      template: {
        ...template.index_template.template,
        settings: {
          ...template.index_template.template?.settings,
          'index.mapping.total_fields.limit': limit,
        },
      },
    },
  });
};
