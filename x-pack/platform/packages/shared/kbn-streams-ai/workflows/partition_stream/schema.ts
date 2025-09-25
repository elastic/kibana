/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const schema: object = {
  openapi: '3.0.0',
  info: { title: 'Partition Condition Schema', version: '1.0.0' },
  components: {
    schemas: {
      StringOrNumberOrBoolean: {
        oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        description: 'A value that can be a string, number, or boolean.',
      },
      RangeCondition: {
        type: 'object',
        properties: {
          gt: { $ref: '#/components/schemas/StringOrNumberOrBoolean' },
          gte: { $ref: '#/components/schemas/StringOrNumberOrBoolean' },
          lt: { $ref: '#/components/schemas/StringOrNumberOrBoolean' },
          lte: { $ref: '#/components/schemas/StringOrNumberOrBoolean' },
        },
        description: 'A condition specifying a range of values.',
      },
      UnaryOperator: {
        type: 'string',
        enum: ['exists', 'notExists'],
        description: 'Operator for unary conditions.',
      },
      BinaryFilterCondition: {
        type: 'object',
        properties: {
          field: { type: 'string', minLength: 1, description: 'The document field to filter on.' },
          eq: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Equality comparison value.',
          },
          neq: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Inequality comparison value.',
          },
          lt: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Less-than comparison value.',
          },
          lte: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Less-than-or-equal comparison value.',
          },
          gt: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Greater-than comparison value.',
          },
          gte: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Greater-than-or-equal comparison value.',
          },
          contains: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Contains comparison value.',
          },
          startsWith: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Starts-with comparison value.',
          },
          endsWith: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'Ends-with comparison value.',
          },
          range: {
            $ref: '#/components/schemas/RangeCondition',
            description: 'Range comparison values.',
          },
        },
        required: ['field'],
        description:
          'A condition that compares a field to a value or range using an operator as the key.',
        additionalProperties: false,
        allOf: [
          {
            description: 'Ensure at least one operator is specified.',
            not: {
              properties: {
                eq: { not: {} },
                neq: { not: {} },
                lt: { not: {} },
                lte: { not: {} },
                gt: { not: {} },
                gte: { not: {} },
                contains: { not: {} },
                startsWith: { not: {} },
                endsWith: { not: {} },
                range: { not: {} },
              },
              required: [],
            },
          },
        ],
      },
      UnaryFilterCondition: {
        type: 'object',
        properties: {
          field: { type: 'string', minLength: 1, description: 'The document field to check.' },
          exists: { type: 'boolean', description: 'Indicates whether the field exists or not.' },
        },
        required: ['field'],
        description: 'A condition that checks for the existence or non-existence of a field.',
      },
      FilterCondition: {
        oneOf: [
          { $ref: '#/components/schemas/UnaryFilterCondition' },
          { $ref: '#/components/schemas/BinaryFilterCondition' },
        ],
        description: 'A basic filter condition, either unary or binary.',
      },
      AndCondition: {
        type: 'object',
        properties: {
          and: {
            type: 'array',
            items: { $ref: '#/components/schemas/Condition' },
            description:
              'An array of conditions. All sub-conditions must be true for this condition to be true.',
          },
        },
        required: ['and'],
        description: 'A logical AND that groups multiple conditions.',
      },
      OrCondition: {
        type: 'object',
        properties: {
          or: {
            type: 'array',
            items: { $ref: '#/components/schemas/Condition' },
            description:
              'An array of conditions. At least one sub-condition must be true for this condition to be true.',
          },
        },
        required: ['or'],
        description: 'A logical OR that groups multiple conditions.',
      },
      NotCondition: {
        type: 'object',
        properties: {
          not: {
            $ref: '#/components/schemas/Condition',
            description: 'A condition that negates another condition.',
          },
        },
        required: ['not'],
        description: 'A logical NOT that negates a condition.',
      },
      AlwaysCondition: {
        type: 'object',
        properties: {
          always: {
            type: 'object',
            description: 'An empty object. This condition always matches.',
            additionalProperties: false,
          },
        },
        required: ['always'],
        description:
          'A condition that always evaluates to true. Useful for catch-all scenarios, but use with caution as partitions are ordered.',
      },
      NeverCondition: {
        type: 'object',
        properties: {
          never: {
            type: 'object',
            description: 'An empty object. This condition never matches.',
            additionalProperties: false,
          },
        },
        required: ['never'],
        description: 'A condition that always evaluates to false.',
      },
      Condition: {
        oneOf: [
          { $ref: '#/components/schemas/FilterCondition' },
          { $ref: '#/components/schemas/AndCondition' },
          { $ref: '#/components/schemas/OrCondition' },
          { $ref: '#/components/schemas/NotCondition' },
          { $ref: '#/components/schemas/NeverCondition' },
          { $ref: '#/components/schemas/AlwaysCondition' },
        ],
        description:
          'The root condition object for a partition. It can be a simple filter or a combination of other conditions.',
      },
    },
  },
};
