/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export interface MapsConfigType {
  showMapsInspectorAdapter: boolean;
  preserveDrawingBuffer: boolean;
}

export const configSchema = schema.object({
  // flag used in functional testing
  showMapsInspectorAdapter: schema.boolean({ defaultValue: false }),
  // flag used in functional testing
  preserveDrawingBuffer: schema.boolean({ defaultValue: false }),
});

export type MapsXPackConfig = TypeOf<typeof configSchema>;
