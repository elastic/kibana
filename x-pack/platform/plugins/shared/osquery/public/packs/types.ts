/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Shard } from '../../common/utils/converters';
import type { PackQueryFormData } from './queries/use_pack_query_form';

export interface PackSavedObject {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: Record<string, Omit<PackQueryFormData, 'id'>>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  references: Array<{ name: string; id: string; type: string }>;
}

export type PackItem = PackSavedObject & {
  id: string;
  policy_ids: string[];
  read_only?: boolean;
  shards?: Shard;
};
