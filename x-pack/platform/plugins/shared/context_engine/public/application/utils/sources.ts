/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexSource, AiIndexSourceType } from '../../../common/http_api/ai_indices';
import type { SelectedSource, SourceType } from '../components/source_picker';

/**
 * Maps a stored AI index source type to the UI source type used by the source
 * picker.
 */
const AI_INDEX_SOURCE_TYPE_TO_SOURCE_TYPE: Record<AiIndexSourceType, SourceType> = {
  esql: 'esql',
};

export const toSourceType = (type: AiIndexSourceType): SourceType =>
  AI_INDEX_SOURCE_TYPE_TO_SOURCE_TYPE[type];

export const toEsqlViewSourceQuery = (viewName: string): string => `FROM ${viewName}`;

/**
 * Converts the source picker selection into the shape stored on the AI index.
 */
export const toAiIndexSources = (selectedSources: SelectedSource[]): AiIndexSource[] =>
  selectedSources
    .filter((source) => source.type === 'esql_view' || source.type === 'esql')
    .map((source) => ({ type: 'esql', value: source.value }));

/**
 * Rebuilds source picker selections from the sources stored on an AI index.
 * Stored sources are plain ES|QL queries, so they are always restored as raw
 * `esql` sources. The `esql_view` type only exists while a view is being added
 * in the picker; once persisted, an imported view is indistinguishable from any
 * other ES|QL query.
 */
export const toSelectedSources = (sources: AiIndexSource[]): SelectedSource[] =>
  sources.map((source) => ({
    type: 'esql',
    id: source.value,
    label: source.value,
    value: source.value,
  }));
