/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const NODE_ATTRS_KEYS_TO_IGNORE: string[] = [
  'ml.enabled',
  'ml.machine_memory',
  'ml.max_open_jobs',
  // Used by ML to identify nodes that have transform enabled:
  // https://github.com/elastic/elasticsearch/pull/52712/files#diff-225cc2c1291b4c60a8c3412a619094e1R147
  'transform.node',
  'xpack.installed',
];
