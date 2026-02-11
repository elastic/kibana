/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_BASE_PREFIX = 'entities';
export const ENTITY_HISTORY = 'history' as const;
export const ENTITY_LATEST = 'latest' as const;
export const ENTITY_UPDATES = 'updates' as const;
export const ENTITY_RESET = 'reset' as const;

export const ENTITY_SCHEMA_VERSION_V1 = 'v1';

type SchemaVersion = `v${number}`;
type Dataset =
  | typeof ENTITY_LATEST
  | typeof ENTITY_HISTORY
  | typeof ENTITY_RESET
  | typeof ENTITY_UPDATES;

interface IndexPatternOptions<TDataset extends Dataset> {
  dataset: TDataset;
  schemaVersion: SchemaVersion;
  definitionId: string;
}

interface AliasPatternOptions<TDataset extends Dataset> {
  dataset: TDataset;
  type: string;
}

// For both ENTITY_LATEST and ENTITY_RESET
export function entitiesIndexPattern<TDataset extends Dataset>({
  schemaVersion,
  dataset,
  definitionId,
}: IndexPatternOptions<TDataset>) {
  return `.${ENTITY_BASE_PREFIX}.${schemaVersion}.${dataset}.${definitionId}` as const;
}

// FOR ENTITY_HISTORY, since it includes a date section
export function entitiesHistoryIndexPattern<TDataset extends Dataset>({
  schemaVersion,
  dataset,
  definitionId,
}: IndexPatternOptions<TDataset>) {
  return `.${ENTITY_BASE_PREFIX}.${schemaVersion}.${dataset}.*.${definitionId}` as const;
}

export function entitiesAliasPattern<TDataset extends Dataset>({
  type,
  dataset,
}: AliasPatternOptions<TDataset>) {
  return `${ENTITY_BASE_PREFIX}-${type}-${dataset}` as const;
}
