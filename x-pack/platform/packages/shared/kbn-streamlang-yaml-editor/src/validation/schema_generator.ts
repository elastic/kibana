/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  streamlangDSLSchema,
  getJsonSchemaFromStreamlangSchema,
  type StreamType,
} from '@kbn/streamlang';

/**
 * Generate JSON Schema from Streamlang Zod schema for Monaco YAML validation
 *
 * @param streamType - Optional stream type to filter available actions
 * Returns null if schema generation fails, allowing fallback to basic syntax highlighting
 */
export function generateStreamlangJsonSchema(streamType?: StreamType): object | null {
  try {
    // Convert Zod schema to JSON Schema with proper fixes
    const jsonSchema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema, streamType);

    return jsonSchema;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to generate Streamlang JSON schema:', error);
    return null;
  }
}

/**
 * Get Monaco YAML schema configuration for Streamlang
 *
 * @param streamType - Optional stream type to filter available actions
 */
export function getStreamlangMonacoSchemaConfig(streamType?: StreamType) {
  const schema = generateStreamlangJsonSchema(streamType);

  if (!schema) {
    // eslint-disable-next-line no-console
    console.warn('Failed to generate Streamlang JSON schema');
    // Fallback to basic YAML highlighting without validation
    return null;
  }

  return {
    uri: 'http://elastic.co/schemas/streamlang.json',
    // Use ['*'] to match all files since Monaco's in-memory model doesn't have a specific filename
    fileMatch: ['*'],
    schema,
  };
}
