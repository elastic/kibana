/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DataSourceType = 'index' | 'data_stream' | 'alias';
export type FreshnessCategory = 'live' | 'recent' | 'stale' | 'empty';

export interface FieldMetadata {
  name: string;
  type: string;
  ecs: boolean;
  searchable: boolean;
  aggregatable: boolean;
}

export interface IntegrationMetadata {
  package_name: string;
  package_title: string;
  package_version: string;
  integration_name?: string;
  dataset: string;
  description: string;
  data_stream_title: string;
  icons?: Array<{ src: string; type?: string }>;
}

export interface DataSourceStats {
  doc_count: number;
  size_bytes: number;
  last_ingested_at: string | null;
  is_active: boolean;
  freshness_category: FreshnessCategory;
}

export interface DataSourceSemantic {
  summary: string;
  field_annotations?: Record<string, string>;
  topics?: string[];
  mitre_techniques?: string[];
  embedding?: number[];
}

export interface DataSourceEntry {
  id: string;
  name: string;
  type: DataSourceType;
  mapping: {
    fields: FieldMetadata[];
    total_field_count: number;
    ecs_field_count: number;
    ecs_field_coverage: number;
  };
  template?: {
    name: string;
    meta?: Record<string, unknown>;
  };
  integration?: IntegrationMetadata;
  stats?: DataSourceStats;
  semantic?: DataSourceSemantic;
  catalog_version: number;
  refreshed_at: string;
}

export interface CatalogQueryParams {
  namePattern?: string;
  type?: DataSourceType;
  integrationPackage?: string;
  hasFields?: string[];
  searchText?: string;
  activeOnly?: boolean;
  size?: number;
  /** Optional embedding vector for semantic/kNN search */
  embedding?: number[];
}

export interface CatalogQueryResult {
  entries: DataSourceEntry[];
  total: number;
}
