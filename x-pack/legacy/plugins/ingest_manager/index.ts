/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { resolve } from 'path';

export function ingestManager(kibana: any) {
  return new kibana.Plugin({
    id: 'ingestManager',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, '../../../plugins/ingest_manager/public'),
  });
}
