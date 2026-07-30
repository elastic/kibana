/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';

export type UnsupportedApmServerSchema = Array<{ key: string; value: unknown }>;

export interface UnsupportedApmServerSchemaResponse {
  unsupported: UnsupportedApmServerSchema;
}

export const unsupportedApmServerSchemaRoute = defineRoute<UnsupportedApmServerSchemaResponse>()({
  endpoint: 'GET /internal/apm/fleet/apm_server_schema/unsupported',
});
