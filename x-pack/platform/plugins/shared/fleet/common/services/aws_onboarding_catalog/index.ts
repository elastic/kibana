/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './aws_service_matrix';
export * from './field_config';
export * from './instances';
export * from './package_inputs';
export * from './service_index_patterns';
export * from './types';

// field_config and package_inputs each define a different getRegionFieldName. The package_inputs
// one keeps the plain name (the deploy path); the form's one, which falls back to aws_region, is
// exported under its own name.
export { getRegionFieldName } from './package_inputs';
export { getRegionFieldName as getFormRegionFieldName } from './field_config';
