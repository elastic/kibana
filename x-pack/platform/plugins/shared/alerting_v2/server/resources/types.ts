/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import type { MappingsDefinition } from '@kbn/es-mappings';

export interface ResourceDefinition {
  key: string;
  dataStreamName: string;
  version: number;
  mappings: MappingsDefinition;
  ilmPolicy: {
    name: string;
    policy: IlmPolicy;
  };
}
