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
      BinaryOperator: {
        type: 'string',
        enum: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith'],
        description: 'Operator for binary conditions.',
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
          operator: { $ref: '#/components/schemas/BinaryOperator' },
          value: {
            $ref: '#/components/schemas/StringOrNumberOrBoolean',
            description: 'The value to compare the field against.',
          },
        },
        required: ['field', 'operator', 'value'],
        description:
          'A condition that compares a field to a value (e.g., field == value, field > value).',
      },
      UnaryFilterCondition: {
        type: 'object',
        properties: {
          field: { type: 'string', minLength: 1, description: 'The document field to check.' },
          operator: { $ref: '#/components/schemas/UnaryOperator' },
        },
        required: ['field', 'operator'],
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
          { $ref: '#/components/schemas/NeverCondition' },
          { $ref: '#/components/schemas/AlwaysCondition' },
        ],
        description:
          'The root condition object for a partition. It can be a simple filter or a combination of other conditions.',
      },
    },
  },
};
