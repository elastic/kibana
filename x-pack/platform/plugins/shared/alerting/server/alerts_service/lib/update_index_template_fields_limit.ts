/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';

export const updateIndexTemplateFieldsLimit = ({
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
    ...template.index_template,
    template: {
      ...template.index_template.template,
      settings: {
        ...template.index_template.template?.settings,
        'index.mapping.total_fields.limit': limit,
        'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
      },
    },
    // GET brings string | string[] | undefined but this PUT expects string[]
    ignore_missing_component_templates: template.index_template.ignore_missing_component_templates
      ? [template.index_template.ignore_missing_component_templates].flat()
      : undefined,
  });
};
