/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineProcessor } from '../../../../types/processors/ingest_pipeline_processors';
import type { StreamlangProcessorDefinition } from '../../../../types/processors';

/**
 * Mapping of Streamlng processor fields to Ingest processor fields.
 */
export const processorFieldRenames: Record<string, Record<string, string>> = {
  grok: { from: 'field', where: 'if' },
  dissect: { from: 'field', where: 'if' },
  date: { from: 'field', to: 'target_field', where: 'if' },
  drop_document: { where: 'if' },
  math: { where: 'if' },
  rename: { from: 'field', to: 'target_field', where: 'if' },
  set: { to: 'field', where: 'if' },
  append: { to: 'field', where: 'if' },
  convert: { from: 'field', to: 'target_field', where: 'if' },
  remove_by_prefix: { from: 'fields' },
  remove: { from: 'field', where: 'if' },
  replace: { from: 'field', to: 'target_field', where: 'if' },
  uppercase: { from: 'field', to: 'target_field', where: 'if' },
  lowercase: { from: 'field', to: 'target_field', where: 'if' },
  trim: { from: 'field', to: 'target_field', where: 'if' },
  join: { to: 'field', where: 'if' },
  manual_ingest_pipeline: { where: 'if' },
};

export function renameFields<T extends Record<string, any>>(
  obj: T,
  renames: Record<string, string>
): T {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = renames[key] || key;
      result[newKey] = obj[key];
    }
  }
  return result as T;
}

/**
 * Mapping of Streamlang action names to Ingest Pipeline processor names. Maps only when they differ.
 */
const processorRenames: Record<string, string> = {
  drop_document: 'drop',
  replace: 'gsub',
};

function renameProcessor(action: string) {
  return processorRenames[action] || action;
}

export const applyPreProcessing = (
  action: StreamlangProcessorDefinition['action'],
  processorWithRenames: IngestPipelineProcessor
): IngestProcessorContainer[] => {
  // Default: return processor as-is
  return [
    {
      [renameProcessor(action)]: { ...processorWithRenames },
    },
  ];
};
