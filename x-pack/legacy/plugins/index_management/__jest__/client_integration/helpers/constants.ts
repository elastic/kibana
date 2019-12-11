/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TEMPLATE_NAME = 'my_template';

export const INDEX_PATTERNS = ['my_index_pattern'];

export const SETTINGS = {
  number_of_shards: 1,
  index: {
    lifecycle: {
      name: 'my_policy',
    },
  },
};

export const ALIASES = {
  alias: {
    filter: {
      term: { user: 'my_user' },
    },
  },
};

export const MAPPINGS = {
  dynamic: true,
  numeric_detection: false,
  date_detection: true,
  dynamic_date_formats: ['strict_date_optional_time', 'yyyy/MM/dd HH:mm:ss Z||yyyy/MM/dd Z'],
  properties: {},
};
