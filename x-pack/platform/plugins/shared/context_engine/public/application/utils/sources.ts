/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlView } from '@kbn/esql-types';
import type { AiIndexSource, AiIndexSourceType } from '../../../common/http_api/ai_indices';
import type { SelectedSource, SourceType } from '../components/source_picker';

/**
 * Maps a stored AI index source type to the UI source type used by the source
 * picker. Keyed by `AiIndexSourceType` so a new API type is a compile error
 * until it is mapped.
 */
const AI_INDEX_SOURCE_TYPE_TO_SOURCE_TYPE: Record<AiIndexSourceType, SourceType> = {
  esql: 'esql_view',
};

export const toSourceType = (type: AiIndexSourceType): SourceType =>
  AI_INDEX_SOURCE_TYPE_TO_SOURCE_TYPE[type];

export const toEsqlViewSourceQuery = (viewName: string): string => `FROM ${viewName}`;

/**
 * Converts the source picker selection into the shape stored on the AI index.
 * Only ES|QL view sources are persisted for now; other source types are skipped
 * until the API supports them.
 */
export const toAiIndexSources = (selectedSources: SelectedSource[]): AiIndexSource[] =>
  selectedSources
    .filter((source) => source.type === 'esql_view')
    .map((source) => ({ type: 'esql', value: source.value }));

export const toSelectedSources = (sources: AiIndexSource[], views: EsqlView[]): SelectedSource[] =>
  sources.map((source) => {
    const matchingView = views.find((view) => toEsqlViewSourceQuery(view.name) === source.value);
    return {
      type: 'esql_view',
      id: matchingView?.name ?? source.value,
      label: matchingView?.name ?? source.value,
      value: source.value,
    };
  });
