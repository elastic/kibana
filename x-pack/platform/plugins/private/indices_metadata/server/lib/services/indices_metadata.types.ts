/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DateTime } from '@elastic/elasticsearch/lib/api/types';
import { schema, TypeOf } from '@kbn/config-schema';

export const IndicesMetadataConfigurationSchema = schema.object({
  indices_threshold: schema.number(),
  datastreams_threshold: schema.number(),
  indices_settings_threshold: schema.number(),
  index_query_size: schema.number(),
  ilm_stats_query_size: schema.number(),
  ilm_policy_query_size: schema.number(),
});

export type IndicesMetadataConfiguration = TypeOf<typeof IndicesMetadataConfigurationSchema>;

export interface IlmPolicies {
  items: IlmPolicy[];
}

export interface IlmPolicy {
  policy_name: string;
  modified_date: DateTime;
  phases: IlmPhases;
}

export interface IlmPhases {
  cold?: IlmPhase;
  delete?: IlmPhase;
  frozen?: IlmPhase;
  hot?: IlmPhase;
  warm?: IlmPhase;
}

export interface IlmPhase {
  min_age: string;
}

export interface IlmsStats {
  items: IlmStats[];
}

export interface IlmStats {
  index_name: string;
  phase?: string;
  age?: string;
  policy_name?: string;
}

export interface IndexTemplatesStats {
  items: IndexTemplateInfo[];
}

export interface IndexTemplateInfo {
  template_name: string;
  index_mode?: string;
  datastream: boolean;
  package_name?: string;
  managed_by?: string;
  beat?: string;
  is_managed?: boolean;
  composed_of: string[];
  source_enabled?: boolean;
  source_includes: string[];
  source_excludes: string[];
}

export interface IndicesStats {
  items: IndexStats[];
}

export interface IndexStats {
  index_name: string;

  query_total?: number;
  query_time_in_millis?: number;

  // values for primary shards
  docs_count_primaries?: number;
  docs_deleted_primaries?: number;
  docs_total_size_in_bytes_primaries?: number;

  // values for primary and replica shards
  docs_count?: number;
  docs_deleted?: number;
  docs_total_size_in_bytes?: number;

  index_failed?: number;
  index_failed_due_to_version_conflict?: number;
}

export interface IndicesSettings {
  items: IndexSettings[];
}

export interface IndexSettings {
  index_name: string;
  index_mode?: string;
  default_pipeline?: string;
  final_pipeline?: string;
  source_mode?: string;
}

export interface Index {
  index_name: string;
  ilm_policy?: string;
}

export interface DataStreams {
  items: DataStream[];
}
export interface DataStream {
  datastream_name: string;
  ilm_policy?: string;
  template?: string;
  indices?: Index[];
}
