/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Layers as persisted in saved object layerListJSON (camelCase keys).
 * Migrations operate on stored JSON that can predate any type definition so keep the type loose.
 * Do not use descriptor types, which use snake_case keys, to read or write stored layers.
 */
export interface StoredLayer {
  type?: string;
  sourceDescriptor?: { type?: string; [key: string]: unknown };
  style?: { type?: string; properties?: Record<string, unknown>; [key: string]: unknown };
  joins?: Array<{ leftField?: string; right?: { [key: string]: unknown } }>;
  [key: string]: unknown;
}
