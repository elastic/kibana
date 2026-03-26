/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { objectTypeToGetResultSchema } from '@kbn/content-management-utils';

import { lensSavedObjectSchemaV0 } from './common';

/**
 * @deprecated - use `v1` schemas
 */
export const lensCMGetResultSchemaV0 = objectTypeToGetResultSchema(lensSavedObjectSchemaV0);
