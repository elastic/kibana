/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { versionSchema as versionSchemaV1 } from '../v1';
export * from '../v1';

// We just remove the trackedExecutions field in v2, so it becomes same as the v1 schema
export const versionSchema = versionSchemaV1;
