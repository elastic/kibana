/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/types';

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

// 8.0 -> 9.0 warnings
export type IndexWarningType = 'indexSetting' | 'replaceIndexWithAlias' | 'makeIndexReadonly';

export interface IndexWarning {
  warningType: IndexWarningType;
  flow: 'reindex' | 'readonly' | 'all';
  /**
   * Optional metadata for deprecations
   *
   * @remark
   * For "indexSetting" we want to surface the deprecated settings.
   */
  meta?: {
    [key: string]: string | string[] | boolean;
  };
}

export interface ResolveIndexResponseFromES {
  indices: Array<{
    name: string;
    // per https://github.com/elastic/elasticsearch/pull/57626
    attributes: Array<'open' | 'closed' | 'hidden' | 'frozen'>;
    aliases?: string[];
    data_stream?: string;
  }>;
  aliases: Array<{
    name: string;
    indices: string[];
  }>;
  data_streams: Array<{ name: string; backing_indices: string[]; timestamp_field: string }>;
}
