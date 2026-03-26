/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createClient as createToolHealthClient,
  type ToolHealthClient,
  toolHealthIndexName,
  type ToolHealthProperties,
  type ToolHealthDocument,
  type ToolHealthState,
  type ToolHealthStatus,
  type ToolHealthUpdateParams,
} from './client';
