/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// In the long-term, we'll want to remove the connector_spec dependency from this package
// Packages using this shared package should be able to define their own metadata
import type { BaseMetadata } from '@kbn/connector-specs/src/connector_spec_ui';
export type { BaseMetadata };
export { getMeta, setMeta, addMeta } from '@kbn/connector-specs/src/connector_spec_ui';
