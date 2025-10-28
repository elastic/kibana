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
  convert: { from: 'field', to: 'target_field', where: 'if' },
  remove_by_prefix: { from: 'fields' },
  remove: { from: 'field', where: 'if' },
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
  // Special handling for remove_by_prefix: convert to script processor
  if (action === 'remove_by_prefix') {
    const {
      fields,
      tag,
      description,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ignore_failure,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      on_failure,
    } = processorWithRenames as any;
    const fieldArray = Array.isArray(fields) ? fields : [fields];

    // Build Painless script to remove field and all nested fields (field.*)
    // This handles both subobjects and flattened fields
    const removeStatements = fieldArray
      .map((field: string) => {
        const parts = field.split('.');

        // For nested fields (e.g., 'metadata.user'), navigate to parent and remove child
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join('.');
          const childKey = parts[parts.length - 1];

          // Build script to navigate and remove nested field
          let script = `if (ctx?.${parentPath} instanceof Map) { ctx.${parentPath}.remove('${childKey}'); }`;

          // Also remove any flattened keys that start with this prefix
          script += `
      List keysToRemove = new ArrayList();
      for (key in ctx.keySet()) {
        if (key.startsWith('${field}.')) {
          keysToRemove.add(key);
        }
      }
      for (key in keysToRemove) {
        ctx.remove(key);
      }`;

          return script;
        } else {
          // For top-level fields, remove directly
          let script = `ctx.remove('${field}');`;

          // For flattened fields, remove all keys that start with the prefix
          script += `
      List keysToRemove = new ArrayList();
      for (key in ctx.keySet()) {
        if (key.startsWith('${field}.')) {
          keysToRemove.add(key);
        }
      }
      for (key in keysToRemove) {
        ctx.remove(key);
      }`;

          return script;
        }
      })
      .join('\n');

    const scriptProcessor: any = {
      source: removeStatements,
    };

    // Only add valid script processor fields if they exist
    if (tag !== undefined) scriptProcessor.tag = tag;
    if (description !== undefined) scriptProcessor.description = description;
    if (ignore_failure !== undefined) scriptProcessor.ignore_failure = ignore_failure;

    const result: IngestProcessorContainer = {
      script: scriptProcessor,
    };

    // on_failure goes at the processor container level, not inside script
    if (on_failure !== undefined) {
      (result as any).on_failure = on_failure;
    }

    return [result];
  }

  // Default: return processor as-is
  return [
    {
      [action]: { ...processorWithRenames },
    },
  ];
};
