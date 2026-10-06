/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
export declare const backgroundTaskNodeSchemaV1: import('@kbn/config-schema').ObjectType<{
  id: import('@kbn/config-schema').Type<string>;
  last_seen: import('@kbn/config-schema').Type<string>;
}>;
export type BackgroundTaskNode = TypeOf<typeof backgroundTaskNodeSchemaV1>;
