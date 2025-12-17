/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';

export interface ProcessorSuggestion {
  name: string;
  template?: JsonValue;
}

export interface ProcessorPropertySuggestion {
  name: string;
  template?: JsonValue;
}

export interface ProcessorSuggestionsResponse {
  processors: ProcessorSuggestion[];
  propertiesByProcessor: Record<string, ProcessorPropertySuggestion[]>;
}
