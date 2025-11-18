/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { conditionSchema } from './condition_schema';
import type { SimpleJSONSchema } from './types';

export const processingSchema: SimpleJSONSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $defs: {
    ...conditionSchema.$defs,
    customIdentifier: { type: 'string', minLength: 1 },
    simpleString: { type: 'string' },
    fromTo: { $ref: '#/$defs/customIdentifier' },
    baseProcessorProps: {
      type: 'object',
      properties: {
        customIdentifier: { $ref: '#/$defs/customIdentifier' },
        description: { type: 'string' },
        ignore_failure: { type: 'boolean' },
        where: { $ref: '#/$defs/where' },
      },
      additionalProperties: false,
    },
  },
  anyOf: [
    {
      anyOf: [
        /* grok */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'grok' },
            from: { $ref: '#/$defs/fromTo' },
            patterns: { type: 'array', items: { $ref: '#/$defs/customIdentifier' }, minItems: 1 },
            pattern_definitions: { type: 'object', additionalProperties: { type: 'string' } },
            ignore_missing: { type: 'boolean' },
          },
          required: ['action', 'from', 'patterns'],
          additionalProperties: false,
        },

        /* dissect */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'dissect' },
            from: { $ref: '#/$defs/fromTo' },
            pattern: { $ref: '#/$defs/customIdentifier' },
            append_separator: { type: 'string', minLength: 1 },
            ignore_missing: { type: 'boolean' },
          },
          required: ['action', 'from', 'pattern'],
          additionalProperties: false,
        },

        /* date */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'date' },
            from: { $ref: '#/$defs/fromTo' },
            to: { $ref: '#/$defs/fromTo' },
            formats: { type: 'array', items: { $ref: '#/$defs/customIdentifier' } },
            output_format: { $ref: '#/$defs/customIdentifier' },
            timezone: { $ref: '#/$defs/customIdentifier' },
            locale: { $ref: '#/$defs/customIdentifier' },
          },
          required: ['action', 'from', 'formats'],
          additionalProperties: false,
        },

        /* rename */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'rename' },
            from: { $ref: '#/$defs/fromTo' },
            to: { $ref: '#/$defs/fromTo' },
            ignore_missing: { type: 'boolean' },
            override: { type: 'boolean' },
          },
          required: ['action', 'from', 'to'],
          additionalProperties: false,
        },

        /* set */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'set' },
            to: { $ref: '#/$defs/fromTo' },
            override: { type: 'boolean' },
            value: {},
            copy_from: { $ref: '#/$defs/fromTo' },
          },
          required: ['action', 'to'],
          additionalProperties: false,
        },

        /* append */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'append' },
            to: { $ref: '#/$defs/fromTo' },
            value: { type: 'array', items: {}, minItems: 1 },
            allow_duplicates: { type: 'boolean' },
          },
          required: ['action', 'to', 'value'],
          additionalProperties: false,
        },

        /* remove_by_prefix */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            action: { type: 'string', const: 'remove_by_prefix' },
            from: { $ref: '#/$defs/fromTo' },
          },
          required: ['action', 'from'],
          additionalProperties: false,
        },

        /* remove */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'remove' },
            from: { $ref: '#/$defs/fromTo' },
            ignore_missing: { type: 'boolean' },
          },
          required: ['action', 'from'],
          additionalProperties: false,
        },

        /* convert */
        {
          type: 'object',
          properties: {
            customIdentifier: { $ref: '#/$defs/customIdentifier' },
            description: { type: 'string' },
            ignore_failure: { type: 'boolean' },
            where: { $ref: '#/$defs/where' },
            action: { type: 'string', const: 'convert' },
            from: { $ref: '#/$defs/fromTo' },
            to: { $ref: '#/$defs/fromTo' },
            type: { type: 'string', enum: ['integer', 'long', 'double', 'boolean', 'string'] },
            ignore_missing: { type: 'boolean' },
          },
          required: ['action', 'from', 'type'],
          additionalProperties: false,
        },
      ],
    },

    /* wrapper including steps */
    {
      type: 'object',
      properties: {
        customIdentifier: { $ref: '#/$defs/simpleString' },
        where: {
          allOf: [
            { $ref: '#/$defs/where' },
            {
              type: 'object',
              properties: { steps: { type: 'array', items: { $ref: '#' } } },
              required: ['steps'],
            },
          ],
        },
      },
      required: ['where'],
      additionalProperties: false,
    },
  ],
};
