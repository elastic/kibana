/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const defaultSettings = {
  DEFAULT_SETTING_TIMEOUT: 10000,
  DEFAULT_SETTING_DATE_SEPARATOR: '-',
  DEFAULT_SETTING_INTERVAL: 'week',
  DEFAULT_SETTING_INDEX_SETTINGS: {
    number_of_shards: 1,
    auto_expand_replicas: '0-1',
  },
};
