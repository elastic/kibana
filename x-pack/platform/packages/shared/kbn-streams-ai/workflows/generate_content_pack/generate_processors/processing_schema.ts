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
    DateProcessorConfig: {
      allOf: [
        { $ref: '#/components/schemas/ProcessorBase' },
        {
          type: 'object',
          properties: {
            field: { $ref: '#/components/schemas/NonEmptyString' },
            formats: { type: 'array', items: { $ref: '#/components/schemas/NonEmptyString' } },
            locale: { $ref: '#/components/schemas/NonEmptyString' },
            target_field: { $ref: '#/components/schemas/NonEmptyString' },
            timezone: { $ref: '#/components/schemas/NonEmptyString' },
            output_format: { $ref: '#/components/schemas/NonEmptyString' },
          },
          required: ['field', 'formats'],
        },
      ],
    },
    DateProcessorDefinition: {
      type: 'object',
      properties: { date: { $ref: '#/components/schemas/DateProcessorConfig' } },
      required: ['date'],
      additionalProperties: false,
    },
    KvProcessorConfig: {
      allOf: [
        { $ref: '#/components/schemas/ProcessorBase' },
        {
          type: 'object',
          properties: {
            field: { $ref: '#/components/schemas/NonEmptyString' },
            field_split: { type: 'string' },
            value_split: { type: 'string' },
            target_field: { $ref: '#/components/schemas/NonEmptyString' },
            include_keys: {
              type: 'array',
              items: { $ref: '#/components/schemas/NonEmptyString' },
            },
            exclude_keys: {
              type: 'array',
              items: { $ref: '#/components/schemas/NonEmptyString' },
            },
            ignore_missing: { type: 'boolean' },
            prefix: { $ref: '#/components/schemas/NonEmptyString' },
            trim_key: { $ref: '#/components/schemas/NonEmptyString' },
            trim_value: { $ref: '#/components/schemas/NonEmptyString' },
            strip_brackets: { type: 'boolean' },
          },
          required: ['field', 'field_split', 'value_split'],
        },
      ],
    },
    KvProcessorDefinition: {
      type: 'object',
      properties: { kv: { $ref: '#/components/schemas/KvProcessorConfig' } },
      required: ['kv'],
      additionalProperties: false,
    },
    GeoIpProcessorConfig: {
      type: 'object',
      properties: {
        field: { $ref: '#/components/schemas/NonEmptyString' },
        target_field: { $ref: '#/components/schemas/NonEmptyString' },
        database_file: { $ref: '#/components/schemas/NonEmptyString' },
        properties: { type: 'array', items: { $ref: '#/components/schemas/NonEmptyString' } },
        ignore_missing: { type: 'boolean' },
        first_only: { type: 'boolean' },
      },
      required: ['field'],
    },
    GeoIpProcessorDefinition: {
      type: 'object',
      properties: { geoip: { $ref: '#/components/schemas/GeoIpProcessorConfig' } },
      required: ['geoip'],
      additionalProperties: false,
    },
    RenameProcessorConfig: {
      allOf: [
        { $ref: '#/components/schemas/ProcessorBase' },
        {
          type: 'object',
          properties: {
            field: { $ref: '#/components/schemas/NonEmptyString' },
            target_field: { $ref: '#/components/schemas/NonEmptyString' },
            ignore_missing: { type: 'boolean' },
            override: { type: 'boolean' },
          },
          required: ['field', 'target_field'],
        },
      ],
    },
    RenameProcessorDefinition: {
      type: 'object',
      properties: { rename: { $ref: '#/components/schemas/RenameProcessorConfig' } },
      required: ['rename'],
      additionalProperties: false,
    },
    SetProcessorConfig: {
      allOf: [
        { $ref: '#/components/schemas/ProcessorBase' },
        {
          type: 'object',
          properties: {
            field: { $ref: '#/components/schemas/NonEmptyString' },
            value: { $ref: '#/components/schemas/NonEmptyString' },
            override: { type: 'boolean' },
            ignore_empty_value: { type: 'boolean' },
            media_type: { type: 'string' },
          },
          required: ['field', 'value'],
        },
      ],
    },
    SetProcessorDefinition: {
      type: 'object',
      properties: { set: { $ref: '#/components/schemas/SetProcessorConfig' } },
      required: ['set'],
      additionalProperties: false,
    },
    UrlDecodeProcessorConfig: {
      allOf: [
        { $ref: '#/components/schemas/ProcessorBase' },
        {
          type: 'object',
          properties: {
            field: { $ref: '#/components/schemas/NonEmptyString' },
            target_field: { $ref: '#/components/schemas/NonEmptyString' },
            ignore_missing: { type: 'boolean' },
          },
          required: ['field'],
        },
      ],
    },
    UrlDecodeProcessorDefinition: {
      type: 'object',
      properties: { urldecode: { $ref: '#/components/schemas/UrlDecodeProcessorConfig' } },
      required: ['urldecode'],
      additionalProperties: false,
    },
    UserAgentProcessorConfig: {
      type: 'object',
      properties: {
        field: { $ref: '#/components/schemas/NonEmptyString' },
        target_field: { $ref: '#/components/schemas/NonEmptyString' },
        regex_file: { $ref: '#/components/schemas/NonEmptyString' },
        properties: { type: 'array', items: { $ref: '#/components/schemas/NonEmptyString' } },
        ignore_missing: { type: 'boolean' },
      },
      required: ['field'],
    },
    UserAgentProcessorDefinition: {
      type: 'object',
      properties: { user_agent: { $ref: '#/components/schemas/UserAgentProcessorConfig' } },
      required: ['user_agent'],
      additionalProperties: false,
    },
    RemoveProcessorConfig: {
      type: 'object',
      properties: {
        field: { type: 'array', items: { $ref: '#/components/schemas/NonEmptyString' } },
        ignore_missing: { type: 'boolean' },
      },
      required: ['field'],
    },
    RemoveProcessorDefinition: {
      type: 'object',
      properties: { remove: { $ref: '#/components/schemas/RemoveProcessorConfig' } },
      required: ['remove'],
      additionalProperties: false,
    },
    ProcessorDefinition: {
      oneOf: [
        { $ref: '#/components/schemas/DateProcessorDefinition' },
        { $ref: '#/components/schemas/KvProcessorDefinition' },
        { $ref: '#/components/schemas/GeoIpProcessorDefinition' },
        { $ref: '#/components/schemas/RenameProcessorDefinition' },
        { $ref: '#/components/schemas/SetProcessorDefinition' },
        { $ref: '#/components/schemas/UrlDecodeProcessorDefinition' },
        { $ref: '#/components/schemas/UserAgentProcessorDefinition' },
        { $ref: '#/components/schemas/RemoveProcessorDefinition' },
      ],
    },
  },
};
