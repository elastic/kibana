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
  // Strip system-managed properties that ES returns in GET but rejects in PUT
  const {
    created_date: _createdDate,
    created_date_millis: _createdDateMillis,
    modified_date: _modifiedDate,
    modified_date_millis: _modifiedDateMillis,
    template: existingTemplate,
    ignore_missing_component_templates: ignoreMissing,
    ...rest
  } = template.index_template;

  return esClient.indices.putIndexTemplate({
    name: template.name,
    ...rest,
    template: {
      ...existingTemplate,
      settings: {
        ...existingTemplate?.settings,
        'index.mapping.total_fields.limit': limit,
        'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
      },
    },
    // GET brings string | string[] | undefined but this PUT expects string[]
    ignore_missing_component_templates: ignoreMissing ? [ignoreMissing].flat() : undefined,
  });
};
