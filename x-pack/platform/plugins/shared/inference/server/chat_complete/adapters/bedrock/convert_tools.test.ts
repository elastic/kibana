/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fixSchemaArrayProperties, toolsToConverseBedrock } from './convert_tools';
import { type ToolOptions } from '@kbn/inference-common';

describe('fixSchemaArrayProperties walks $defs/definitions', () => {
  it('strips unsupported keywords inside $defs entries', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        filters: { $ref: '#/$defs/filter' },
      },
      required: ['filters'],
      $defs: {
        filter: {
          type: 'object' as const,
          properties: {
            // z.record() output: propertyNames + additionalProperties
            tags: {
              type: 'object' as const,
              propertyNames: { type: 'string' as const },
              additionalProperties: { type: 'string' as const },
            },
            strict: {
              type: 'object' as const,
              properties: { key: { type: 'string' as const } },
              additionalProperties: false,
            },
          },
          $schema: 'http://json-schema.org/draft-07/schema#',
        },
      },
    };

    const result = fixSchemaArrayProperties(schema as any);
    const filter = result.$defs!.filter as Record<string, unknown>;
    const filterProps = filter.properties as Record<string, unknown>;

    expect(filter.$schema).toBeUndefined();
    expect(filterProps.tags).toEqual({
      type: 'object',
      properties: {},
    });
    expect(filterProps.strict).toEqual({
      type: 'object',
      properties: { key: { type: 'string' } },
    });
    // the $ref target itself is preserved
    expect(result.properties.filters).toEqual({ $ref: '#/$defs/filter' });
  });

  it('strips unsupported keywords inside definitions entries', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        item: { $ref: '#/definitions/item' },
      },
      definitions: {
        item: {
          type: 'object' as const,
          propertyNames: { type: 'string' as const },
          additionalProperties: true,
        },
      },
    };

    const result = fixSchemaArrayProperties(schema as any);
    expect(result.definitions!.item).toEqual({ type: 'object', properties: {} });
  });

  it('leaves schemas without $defs untouched in shape', () => {
    const schema = {
      type: 'object' as const,
      properties: { a: { type: 'string' as const } },
    };
    expect(fixSchemaArrayProperties(schema as any)).toEqual(schema);
  });

  it('is applied end-to-end by toolsToConverseBedrock', () => {
    // propertyNames/additionalProperties are not part of ToolSchemaType —
    // the point of this transform is stripping exactly such keywords
    const tools = {
      search: {
        description: 'search',
        schema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          $defs: {
            filter: {
              type: 'object',
              propertyNames: { type: 'string' },
              additionalProperties: { type: 'string' },
            },
          },
        },
      },
    } as unknown as ToolOptions['tools'];

    const result = toolsToConverseBedrock(
      tools,
      [] as unknown as Parameters<typeof toolsToConverseBedrock>[1]
    ) as Array<{ toolSpec: { inputSchema: { json: any } } }>;

    const json = result[0].toolSpec.inputSchema.json;
    expect(json.$defs.filter.propertyNames).toBeUndefined();
    expect(json.$defs.filter.additionalProperties).toBeUndefined();
  });
});
