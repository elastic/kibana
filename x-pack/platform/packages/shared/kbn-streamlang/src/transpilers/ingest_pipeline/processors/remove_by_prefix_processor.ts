/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestProcessorContainer,
  IngestScriptProcessor,
} from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineRemoveByPrefixProcessor } from '../../../../types/processors/ingest_pipeline_processors';

export const processRemoveByPrefixProcessor = (
  removeByPrefixProcessor: IngestPipelineRemoveByPrefixProcessor
): IngestProcessorContainer[] => {
  const { fields, description, ignore_failure: ignoreFailure } = removeByPrefixProcessor;

  // Type assertion to handle optional fields that may exist at runtime but aren't in the type
  const processorWithOptionalFields =
    removeByPrefixProcessor as IngestPipelineRemoveByPrefixProcessor & {
      tag?: string;
      on_failure?: unknown;
    };

  const fieldArray = Array.isArray(fields) ? fields : [fields];

  // Build Painless script to remove field and all nested fields (field.*)
  // Strategy: Navigate through nested Maps (subobjects) as deep as possible,
  // then remove all keys matching the remaining path prefix
  const removeStatements = fieldArray
    .map((field: string) => {
      const parts = field.split('.');

      // Helper function to navigate and remove with prefix matching
      const navigationScript = `
// Navigate as deep as possible through nested Maps, then remove by prefix
Map currentObj = ctx;
List pathParts = [${parts.map((p) => `'${p}'`).join(', ')}];
int depth = 0;

// Try to navigate as deep as possible through nested subobjects
for (int i = 0; i < pathParts.length - 1; i++) {
  String part = pathParts[i];
  Object next = currentObj != null ? currentObj.get(part) : null;
  if (next instanceof Map) {
    currentObj = (Map) next;
    depth = i + 1;
  } else {
    break;
  }
}

// Build the remaining path from where we stopped navigating
String remainingPath = '';
for (int i = depth; i < pathParts.length; i++) {
  if (i > depth) {
    remainingPath += '.';
  }
  remainingPath += pathParts[i];
}

// Remove the field and all fields with this prefix from currentObj
if (currentObj != null) {
  currentObj.entrySet().removeIf(entry -> {
    String key = entry.getKey();
    // Match exact key or keys that start with remainingPath followed by a dot
    return key.equals(remainingPath) || key.startsWith(remainingPath + '.');
  });
}`;

      return navigationScript;
    })
    .join('\n');

  const scriptProcessor: IngestScriptProcessor = {
    source: removeStatements,
  };

  // Only add valid script processor fields if they exist
  if (processorWithOptionalFields.tag !== undefined) {
    scriptProcessor.tag = processorWithOptionalFields.tag;
  }
  if (description !== undefined) scriptProcessor.description = description;
  if (ignoreFailure !== undefined) scriptProcessor.ignore_failure = ignoreFailure;

  const result: IngestProcessorContainer = {
    script: scriptProcessor,
  };

  return [result];
};
