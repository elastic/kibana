/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Build-time port for `@kbn/config-schema` as used by `errors/query_response_size_exceeded_error.ts`.
// `ByteSizeValue` has no imports; the package root loads Joi and moment.
export { ByteSizeValue } from '../../../../../../../../src/platform/packages/shared/kbn-config-schema/src/byte_size_value';
