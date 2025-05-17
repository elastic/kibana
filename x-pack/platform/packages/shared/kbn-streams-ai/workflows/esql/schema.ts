/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const schema: object = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: "Elasticsearch Field Definition Schemas (without 'system' type)",
  description:
    "JSON schema representations of the provided Zod schemas, with the 'system' type excluded from field configurations.",
  $defs: {
    nonEmptyString: {
      type: 'string',
      minLength: 1,
    },
    fieldDefinitionConfig: {
      type: 'object',
      description: 'Configuration for a field. Based on Elasticsearch MappingProperty',
      properties: {
        type: {
          type: 'string',
          enum: ['keyword', 'match_only_text', 'long', 'double', 'date', 'boolean', 'ip'],
        },
        format: {
          $ref: '#/$defs/nonEmptyString',
        },
      },
      required: ['type'],
      additionalProperties: true,
    },
  },
  fieldDefinitionConfigSchema: {
    description: "Schema for a single field's configuration",
    $ref: '#/$defs/fieldDefinitionConfig',
  },
  fieldDefinitionSchema: {
    type: 'object',
    description:
      'A record of field definitions, where each key is a field name and the value is its configuration ',
    additionalProperties: {
      $ref: '#/$defs/fieldDefinitionConfig',
    },
  },
  namedFieldDefinitionConfigSchema: {
    description: "A field definition configuration that explicitly includes the field's name.",
    allOf: [
      {
        $ref: '#/$defs/fieldDefinitionConfig',
      },
      {
        type: 'object',
        properties: {
          name: {
            $ref: '#/$defs/nonEmptyString',
          },
        },
        required: ['name'],
      },
    ],
  },
};
