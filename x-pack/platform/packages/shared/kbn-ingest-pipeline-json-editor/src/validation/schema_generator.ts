/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const commonProcessorOptions = {
  tag: { type: 'string', description: 'Identifier used by simulation metrics.' },
  description: { type: 'string' },
  if: { type: 'string', description: 'Painless condition for this processor.' },
  ignore_failure: { type: 'boolean' },
  on_failure: {
    type: 'array',
    items: { $ref: '#/definitions/processor' },
  },
};

const stringField = { type: 'string', minLength: 1 };
const stringArray = { type: 'array', items: { type: 'string' }, minItems: 1 };

const processorConfig = (
  properties: Record<string, object> = {},
  options: { required?: string[]; anyOf?: object[] } = {}
) => ({
  type: 'object',
  additionalProperties: true,
  properties: {
    ...properties,
    ...commonProcessorOptions,
  },
  ...(options.required ? { required: options.required } : {}),
  ...(options.anyOf ? { anyOf: options.anyOf } : {}),
});

const processorTypes = [
  ['append', processorConfig({ field: stringField, value: {} }, { required: ['field', 'value'] })],
  [
    'convert',
    processorConfig({ field: stringField, type: stringField }, { required: ['field', 'type'] }),
  ],
  [
    'date',
    processorConfig(
      { field: stringField, formats: stringArray },
      { required: ['field', 'formats'] }
    ),
  ],
  [
    'dissect',
    processorConfig(
      { field: stringField, pattern: stringField },
      { required: ['field', 'pattern'] }
    ),
  ],
  ['drop', processorConfig()],
  [
    'enrich',
    processorConfig(
      {
        policy_name: stringField,
        field: stringField,
        target_field: stringField,
      },
      { required: ['policy_name', 'field', 'target_field'] }
    ),
  ],
  [
    'grok',
    processorConfig(
      {
        field: stringField,
        patterns: stringArray,
        pattern_definitions: { type: 'object', additionalProperties: { type: 'string' } },
      },
      { required: ['field', 'patterns'] }
    ),
  ],
  [
    'gsub',
    processorConfig(
      {
        field: stringField,
        pattern: stringField,
        replacement: { type: 'string' },
      },
      { required: ['field', 'pattern', 'replacement'] }
    ),
  ],
  [
    'join',
    processorConfig(
      { field: stringField, separator: { type: 'string' } },
      { required: ['field', 'separator'] }
    ),
  ],
  ['lowercase', processorConfig({ field: stringField }, { required: ['field'] })],
  ['pipeline', processorConfig({ name: stringField }, { required: ['name'] })],
  [
    'redact',
    processorConfig(
      { field: stringField, patterns: stringArray },
      { required: ['field', 'patterns'] }
    ),
  ],
  [
    'remove',
    processorConfig(
      {
        field: { oneOf: [stringField, stringArray] },
      },
      { required: ['field'] }
    ),
  ],
  [
    'rename',
    processorConfig(
      { field: stringField, target_field: stringField },
      { required: ['field', 'target_field'] }
    ),
  ],
  [
    'set',
    processorConfig(
      { field: stringField, value: {}, copy_from: stringField },
      { required: ['field'], anyOf: [{ required: ['value'] }, { required: ['copy_from'] }] }
    ),
  ],
  [
    'sort',
    processorConfig(
      { field: stringField, order: { enum: ['asc', 'desc'] } },
      { required: ['field'] }
    ),
  ],
  [
    'split',
    processorConfig(
      { field: stringField, separator: { type: 'string' } },
      { required: ['field', 'separator'] }
    ),
  ],
  ['trim', processorConfig({ field: stringField }, { required: ['field'] })],
  ['uppercase', processorConfig({ field: stringField }, { required: ['field'] })],
  [
    'uri_parts',
    processorConfig({ field: stringField, target_field: stringField }, { required: ['field'] }),
  ],
  [
    'user_agent',
    processorConfig({ field: stringField, target_field: stringField }, { required: ['field'] }),
  ],
] as const;

/**
 * Generate JSON Schema for native ingest pipeline processors.
 */
export function generateIngestPipelineJsonSchema(): object {
  const processorProperties = Object.fromEntries(processorTypes);

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Ingest pipeline processors',
    type: 'array',
    items: { $ref: '#/definitions/processor' },
    definitions: {
      processor: {
        type: 'object',
        properties: processorProperties,
        additionalProperties: {
          type: 'object',
          additionalProperties: true,
        },
        minProperties: 0,
        maxProperties: 1,
      },
    },
  };
}

/**
 * Get Monaco JSON schema configuration for native ingest pipeline processors.
 */
export function getIngestPipelineMonacoSchemaConfig() {
  return {
    uri: 'http://elastic.co/schemas/ingest-pipeline-processors.json',
    // Use ['*'] to match all files since Monaco's in-memory model doesn't have a specific filename
    fileMatch: ['*'],
    schema: generateIngestPipelineJsonSchema(),
  };
}
