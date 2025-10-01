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
  rename: { from: 'field', to: 'target_field', where: 'if' },
  set: { to: 'field', where: 'if' },
  append: { to: 'field', where: 'if' },
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

export const applyPreProcessing = (
  action: StreamlangProcessorDefinition['action'],
  processorWithRenames: IngestPipelineProcessor
): IngestProcessorContainer[] => {
  // Placeholder for future pre-processing logic
  // Currently returns processor as-is without any template escaping
  return [
    {
      [action]: { ...processorWithRenames },
    },
  ];
};
