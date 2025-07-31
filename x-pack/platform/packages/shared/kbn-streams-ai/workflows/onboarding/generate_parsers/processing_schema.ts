/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const schema: object = {
  schemas: {
    NonEmptyString: { type: 'string', minLength: 1 },
    StringOrNumberOrBoolean: {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    },
    BinaryFilterCondition: {
      type: 'object',
      properties: {
        field: { $ref: '#/components/schemas/NonEmptyString' },
        operator: {
          type: 'string',
          enum: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith'],
        },
        value: { $ref: '#/components/schemas/StringOrNumberOrBoolean' },
      },
      required: ['field', 'operator', 'value'],
      additionalProperties: false,
    },
    UnaryFilterCondition: {
      type: 'object',
      properties: {
        field: { $ref: '#/components/schemas/NonEmptyString' },
        operator: { type: 'string', enum: ['exists', 'notExists'] },
      },
      required: ['field', 'operator'],
      additionalProperties: false,
    },
    FilterCondition: {
      oneOf: [
        { $ref: '#/components/schemas/UnaryFilterCondition' },
        { $ref: '#/components/schemas/BinaryFilterCondition' },
      ],
    },
    AndCondition: {
      type: 'object',
      properties: { and: { type: 'array', items: { $ref: '#/components/schemas/Condition' } } },
      required: ['and'],
      additionalProperties: false,
    },
    OrCondition: {
      type: 'object',
      properties: { or: { type: 'array', items: { $ref: '#/components/schemas/Condition' } } },
      required: ['or'],
      additionalProperties: false,
    },
    AlwaysCondition: {
      type: 'object',
      properties: { always: { type: 'object', additionalProperties: false } },
      required: ['always'],
      additionalProperties: false,
    },
    NeverCondition: {
      type: 'object',
      properties: { never: { type: 'object', additionalProperties: false } },
      required: ['never'],
      additionalProperties: false,
    },
    Condition: {
      description:
        'A condition for conditional processor execution. Due to recursion, implementations might need to handle lazy loading or specific parsing order.',
      oneOf: [
        { $ref: '#/components/schemas/FilterCondition' },
        { $ref: '#/components/schemas/AndCondition' },
        { $ref: '#/components/schemas/OrCondition' },
        { $ref: '#/components/schemas/NeverCondition' },
        { $ref: '#/components/schemas/AlwaysCondition' },
      ],
    },
    ProcessorBase: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        if: { $ref: '#/components/schemas/Condition' },
        ignore_failure: { type: 'boolean' },
      },
    },
    GrokProcessorConfig: {
      allOf: [
        { $ref: '#/components/schemas/ProcessorBase' },
        {
          type: 'object',
          properties: {
            field: { $ref: '#/components/schemas/NonEmptyString' },
            patterns: {
              type: 'array',
              items: { $ref: '#/components/schemas/NonEmptyString' },
              minItems: 1,
            },
            pattern_definitions: { type: 'object', additionalProperties: { type: 'string' } },
            ignore_missing: { type: 'boolean' },
          },
          required: ['field', 'patterns'],
        },
      ],
    },
    GrokProcessorDefinition: {
      type: 'object',
      properties: { grok: { $ref: '#/components/schemas/GrokProcessorConfig' } },
      required: ['grok'],
      additionalProperties: false,
    },
    DissectProcessorConfig: {
      allOf: [
        { $ref: '#/components/schemas/ProcessorBase' },
        {
          type: 'object',
          properties: {
            field: { $ref: '#/components/schemas/NonEmptyString' },
            pattern: { $ref: '#/components/schemas/NonEmptyString' },
            append_separator: { $ref: '#/components/schemas/NonEmptyString' },
            ignore_missing: { type: 'boolean' },
          },
          required: ['field', 'pattern'],
        },
      ],
    },
    DissectProcessorDefinition: {
      type: 'object',
      properties: { dissect: { $ref: '#/components/schemas/DissectProcessorConfig' } },
      required: ['dissect'],
      additionalProperties: false,
    },
    ProcessorDefinition: {
      oneOf: [
        { $ref: '#/components/schemas/DissectProcessorDefinition' },
        { $ref: '#/components/schemas/GrokProcessorDefinition' },
      ],
    },
  },
};
