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
  connector: 'connector',
};

export const toSourceType = (type: AiIndexSourceType): SourceType =>
  AI_INDEX_SOURCE_TYPE_TO_SOURCE_TYPE[type];

/**
 * Converts the source picker selection into the shape stored on the AI index.
 */
export const toAiIndexSources = (selectedSources: SelectedSource[]): AiIndexSource[] =>
  selectedSources.map((source) => {
    switch (source.type) {
      case 'esql':
        return { type: 'esql', value: source.value };
      case 'connector':
        return { type: 'connector', value: source.value };
      default:
        throw new Error(`Unsupported AI index source type: ${source.type}`);
    }
  });

/**
 * Rebuilds source picker selections from the sources stored on an AI index.
 */
export const toSelectedSources = (sources: AiIndexSource[]): SelectedSource[] =>
  sources.map((source) => ({
    type: toSourceType(source.type),
    id: source.value,
    label: source.value,
    value: source.value,
  }));

/** Builds the ES|QL query used when an index or data stream is selected as a source. */
export const createIndexEsqlQuery = (indexName: string): string => `FROM ${indexName}`;

export const hasSelectedEsqlQuery = (
  selectedSources: SelectedSource[],
  esqlQuery: string
): boolean => selectedSources.some((source) => source.type === 'esql' && source.id === esqlQuery);

/** Whether a simple index-picker source (`FROM <index>`) is already in the selection. */
export const isIndexPickerSourceSelected = (
  selectedSources: SelectedSource[],
  indexName: string
): boolean => hasSelectedEsqlQuery(selectedSources, createIndexEsqlQuery(indexName));

const sourceKey = ({ type, value }: SelectedSource) => `${type}:${value}`;

/** Order-independent equality check on the {type, value} identity of two source lists. */
export const areSourceSelectionsEqual = (a: SelectedSource[], b: SelectedSource[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  const sortedA = a.map(sourceKey).sort();
  const sortedB = b.map(sourceKey).sort();

  return sortedA.every((key, index) => key === sortedB[index]);
};
