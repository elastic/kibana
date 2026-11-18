/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexSource } from '../../../common/http_api/ai_indices';
import type { SelectedSource } from '../components/ai_index_detail/sources/types';

/** Converts the selected sources into the shape stored on the AI index. */
export const toAiIndexSources = (selectedSources: SelectedSource[]): AiIndexSource[] =>
  selectedSources.map(({ type, value }) => ({ type, value }));

/** Rebuilds the selected sources from the sources stored on an AI index. */
export const toSelectedSources = (sources: AiIndexSource[]): SelectedSource[] =>
  sources.map(({ type, value }) => ({ type, value }));

export const toEsqlSource = (query: string): SelectedSource => ({ type: 'esql', value: query });

/** Builds the ES|QL query used when an index or data stream is selected as a source. */
export const createIndexEsqlQuery = (indexName: string): string => `FROM ${indexName}`;

export const hasSelectedEsqlQuery = (
  selectedSources: SelectedSource[],
  esqlQuery: string
): boolean =>
  selectedSources.some((source) => source.type === 'esql' && source.value === esqlQuery);

/** Whether a simple index-picker source (`FROM <index>`) is already in the selection. */
export const isIndexPickerSourceSelected = (
  selectedSources: SelectedSource[],
  indexName: string
): boolean => hasSelectedEsqlQuery(selectedSources, createIndexEsqlQuery(indexName));
