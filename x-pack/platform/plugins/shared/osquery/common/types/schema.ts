/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OsqueryColumn {
  name: string;
  description: string;
  type: string;
  notes?: string;
  hidden?: boolean;
  required?: boolean;
  index?: boolean;
}

export interface OsqueryTable {
  name: string;
  description: string;
  platforms: string[];
  columns: OsqueryColumn[];
}

export interface EcsField {
  field: string;
  type: string;
  normalization: string;
  example: unknown;
  description: string;
}

export type SchemaType = 'osquery' | 'ecs';

export interface SchemaMetadata {
  osquery_version: string;
  ecs_version: string;
}

export interface SchemaResponse {
  version: string;
  pkgVersion?: string;
  data: OsqueryTable[] | EcsField[];
}

export interface OsquerySchemaResponse extends SchemaResponse {
  data: OsqueryTable[];
}

export interface EcsSchemaResponse extends SchemaResponse {
  data: EcsField[];
}
