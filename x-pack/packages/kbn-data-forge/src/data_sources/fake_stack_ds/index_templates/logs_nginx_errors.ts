/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexTemplateDef } from '../../../types';

export const logsNginxErrors: IndexTemplateDef = {
  name: 'logs-nginx-errors',
  template: {
    index_patterns: ['logs-nginx.errors-*'],
    composed_of: ['logs@mappings', 'logs@settings', 'logs@custom', 'ecs@mappings'],
    priority: 103,
    version: 1,
    template: {
      settings: {
        index: {
          default_pipeline: 'logs-nginx.errors@default-pipeline',
        },
      },
    },
    _meta: {
      managed: true,
      description: 'default nginx.errors logs template installed by data_forge',
    },
    data_stream: {
      hidden: false,
      allow_custom_routing: false,
      failure_store: false,
    },
    allow_auto_create: true,
    ignore_missing_component_templates: ['logs@custom'],
    deprecated: false,
  },
  components: [],
};
