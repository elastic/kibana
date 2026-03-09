/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Register Streams and Streamlang Zod v4 schemas as stable named OAS components.
 *
 * Call once at plugin setup time. After this runs, the OAS generator will emit
 * `$ref: '#/components/schemas/<Name>'` (e.g. `Condition`, `FieldDefinition`)
 * instead of inlining or using auto-generated names like `_zod_v4_1___schema1`.
 */

import { registerZodV4Component } from '@kbn/router-to-openapispec';
import { streamsOasDefinitions } from '@kbn/streams-schema';
import { streamlangOasDefinitions } from '@kbn/streamlang';

export function registerStreamsOasComponents() {
  for (const [name, schema] of Object.entries(streamsOasDefinitions)) {
    registerZodV4Component(schema, name);
  }
  for (const [name, schema] of Object.entries(streamlangOasDefinitions)) {
    registerZodV4Component(schema, name);
  }
}
