/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EntityV2 {
  'entity.id': string;
  'entity.type': string;
  'entity.display_name': string;
  'entity.last_seen_timestamp'?: string;
  [metadata: string]: any;
}
