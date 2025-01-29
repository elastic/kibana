/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';

interface Mapping {
  type?: string;
  properties?: MappingProperties;
}

export interface MappingProperties {
  [key: string]: Mapping;
}

interface MetaProperties {
  [key: string]: string;
}

export interface FlatSettings {
  settings?: estypes.IndicesIndexState['settings'];
  mappings?: {
    properties?: MappingProperties;
    _meta?: MetaProperties;
  };
}
