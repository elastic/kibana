/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexSettingsKeys } from '@elastic/elasticsearch/lib/api/types';

export type { Index } from '@kbn/index-management-shared-types';

interface AnalysisModule {
  analyzer: {
    [key: string]: {
      type: string;
      tokenizer: string;
      char_filter?: string[];
      filter?: string[];
      position_increment_gap?: number;
    };
  };
}

export interface IndexSettings {
  index?: IndicesIndexSettingsKeys;
  analysis?: AnalysisModule;
  [key: string]: any;
}

export interface IndexSettingsResponse {
  settings: IndexSettings;
  defaults: IndexSettings;
}
