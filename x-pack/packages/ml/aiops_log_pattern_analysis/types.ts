/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export interface Category {
  key: string;
  count: number;
  subTimeRangeCount?: number;
  subFieldCount?: number;
  subFieldExamples?: string[];
  subFieldSparkline?: Record<number, number>;
  examples: string[];
  sparkline?: Record<number, number>;
  regex: string;
}

interface CategoryExamples {
  hits: { hits: Array<{ _source: { message: string } }> };
}

export interface Sparkline {
  buckets: Array<{ key_as_string: string; key: number; doc_count: number }>;
}

export interface CategoriesAgg {
  categories: {
    buckets: Array<{
      key: string;
      doc_count: number;
      examples: CategoryExamples;
      regex: string;
      sparkline: Sparkline;
      sub_time_range?: {
        buckets: Array<{
          key: number;
          doc_count: number;
          to: number;
          to_as_string: string;
          from: number;
          from_as_string: string;
          sub_field?: {
            doc_count: number;
          };
          examples: CategoryExamples;
          sparkline: Sparkline;
        }>;
      };
    }>;
  };
}

interface CategoriesSampleAgg {
  sample: CategoriesAgg;
}

export interface CatResponse {
  rawResponse: estypes.SearchResponseBody<unknown, CategoriesAgg | CategoriesSampleAgg>;
}
