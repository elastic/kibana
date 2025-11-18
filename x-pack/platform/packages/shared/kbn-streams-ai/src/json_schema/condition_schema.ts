/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SimpleJSONSchema } from './types';

export const conditionSchema: SimpleJSONSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $defs: {
    customIdentifier: { type: 'string', minLength: 1 },
    eqValue: { type: ['string', 'number', 'boolean'] },
    range: {
      type: 'object',
      properties: {
        gt: { $ref: '#/$defs/eqValue' },
        gte: { $ref: '#/$defs/eqValue' },
        lt: { $ref: '#/$defs/eqValue' },
        lte: { $ref: '#/$defs/eqValue' },
      },
      additionalProperties: false,
    },
    fieldComparison: {
      type: 'object',
      properties: {
        field: { $ref: '#/$defs/customIdentifier' },
        eq: { $ref: '#/$defs/eqValue' },
        neq: { $ref: '#/$defs/eqValue' },
        lt: { $ref: '#/$defs/eqValue' },
        lte: { $ref: '#/$defs/eqValue' },
        gt: { $ref: '#/$defs/eqValue' },
        gte: { $ref: '#/$defs/eqValue' },
        contains: { $ref: '#/$defs/eqValue' },
        startsWith: { $ref: '#/$defs/eqValue' },
        endsWith: { $ref: '#/$defs/eqValue' },
        range: { $ref: '#/$defs/range' },
      },
      required: ['field'],
      additionalProperties: false,
    },
    fieldExists: {
      type: 'object',
      properties: { field: { $ref: '#/$defs/customIdentifier' }, exists: { type: 'boolean' } },
      required: ['field'],
      additionalProperties: false,
    },
    where: {
      anyOf: [
        { anyOf: [{ $ref: '#/$defs/fieldComparison' }, { $ref: '#/$defs/fieldExists' }] },
        {
          type: 'object',
          properties: { and: { type: 'array', items: { $ref: '#/$defs/where' } } },
          required: ['and'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: { or: { type: 'array', items: { $ref: '#/$defs/where' } } },
          required: ['or'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: { not: { $ref: '#/$defs/where' } },
          required: ['not'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: { never: { type: 'object', properties: {}, additionalProperties: false } },
          required: ['never'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: { always: { type: 'object', properties: {}, additionalProperties: false } },
          required: ['always'],
          additionalProperties: false,
        },
      ],
    },
  },
};
