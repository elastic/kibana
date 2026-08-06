/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, getAdvancedParameters } from '@kbn/streams-schema';

export interface ProcessingChainEntry {
  source: string;
  steps: unknown[];
}

export interface FieldMappingEntry {
  source: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
}

export const buildProcessingChain = (
  definition: Streams.ingest.all.Definition,
  ancestors: Streams.WiredStream.Definition[]
): ProcessingChainEntry[] => {
  const chain: ProcessingChainEntry[] = [];

  if (Streams.WiredStream.Definition.is(definition)) {
    const sorted = [...ancestors].sort((a, b) => a.name.length - b.name.length);
    for (const ancestor of sorted) {
      if (ancestor.ingest.processing.steps.length > 0) {
        chain.push({
          source: ancestor.name,
          steps: ancestor.ingest.processing.steps,
        });
      }
    }
  }

  chain.push({
    source: definition.name,
    steps: definition.ingest.processing.steps,
  });

  return chain;
};

const buildFieldEntry = (
  source: string,
  fieldName: string,
  fieldDef: { type?: string }
): FieldMappingEntry => {
  const entry: FieldMappingEntry = {
    source,
    name: fieldName,
    type: fieldDef.type || 'object',
  };
  const params = getAdvancedParameters(
    fieldName,
    fieldDef as Parameters<typeof getAdvancedParameters>[1]
  );
  if (Object.keys(params).length > 0) {
    entry.parameters = params;
  }
  return entry;
};

export const buildFieldMappings = (
  definition: Streams.ingest.all.Definition,
  ancestors: Streams.WiredStream.Definition[]
): FieldMappingEntry[] => {
  const fields: FieldMappingEntry[] = [];
  const seen = new Set<string>();

  if (Streams.WiredStream.Definition.is(definition)) {
    const sorted = [...ancestors].sort((a, b) => a.name.length - b.name.length);
    for (const ancestor of sorted) {
      for (const [fieldName, fieldDef] of Object.entries(ancestor.ingest.wired.fields)) {
        if (!seen.has(fieldName)) {
          fields.push(buildFieldEntry(ancestor.name, fieldName, fieldDef));
          seen.add(fieldName);
        }
      }
    }
    for (const [fieldName, fieldDef] of Object.entries(definition.ingest.wired.fields)) {
      if (!seen.has(fieldName)) {
        fields.push(buildFieldEntry(definition.name, fieldName, fieldDef));
        seen.add(fieldName);
      }
    }
  } else if (Streams.ClassicStream.Definition.is(definition)) {
    for (const [fieldName, fieldDef] of Object.entries(
      definition.ingest.classic.field_overrides || {}
    )) {
      fields.push(buildFieldEntry(definition.name, fieldName, fieldDef));
    }
  }

  return fields;
};
