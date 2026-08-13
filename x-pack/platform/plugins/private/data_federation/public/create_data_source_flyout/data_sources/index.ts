/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { s3DataSourceDefinition } from './s3';

export const DATA_SOURCES_DEFINITIONS: Record<string, typeof s3DataSourceDefinition> = {
  [s3DataSourceDefinition.id]: s3DataSourceDefinition,
};
