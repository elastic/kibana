/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
export declare const apiKeyToInvalidateSchemaV1: import('@kbn/config-schema').ObjectType<{
  apiKeyId: import('@kbn/config-schema').Type<string>;
  createdAt: import('@kbn/config-schema').Type<string>;
}>;
export declare const apiKeyToInvalidateSchemaV2: import('@kbn/config-schema').ObjectType<{
  apiKeyId: import('@kbn/config-schema').Type<string>;
  createdAt: import('@kbn/config-schema').Type<string>;
  uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
}>;
export type ApiKeyToInvalidate = TypeOf<typeof apiKeyToInvalidateSchemaV2>;
