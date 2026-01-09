/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { FeatureClient } from './feature_client';
export type { FeatureBulkOperation } from './feature_client';
export { FeatureTypeRegistry } from './feature_type_registry';
export type { FeatureTypeHandler } from './feature_type_handler';
export { SystemFeatureHandler } from './handlers/system';
export type { StoredFeature } from './stored_feature';
export { storedFeatureSchema } from './stored_feature';
