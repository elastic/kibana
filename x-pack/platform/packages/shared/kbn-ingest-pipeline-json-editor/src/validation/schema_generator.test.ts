/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateIngestPipelineJsonSchema } from './schema_generator';

describe('generateIngestPipelineJsonSchema', () => {
  it('requires set processors to have a field and either value or copy_from', () => {
    const schema = generateIngestPipelineJsonSchema() as {
      definitions: {
        processor: {
          properties: {
            set: {
              required: string[];
              anyOf: Array<{ required: string[] }>;
            };
          };
        };
      };
    };

    expect(schema.definitions.processor.properties.set.required).toEqual(['field']);
    expect(schema.definitions.processor.properties.set.anyOf).toEqual([
      { required: ['value'] },
      { required: ['copy_from'] },
    ]);
  });

  it('keeps known processor configs extensible for unsupported native options', () => {
    const schema = generateIngestPipelineJsonSchema() as {
      definitions: {
        processor: {
          properties: {
            set: {
              additionalProperties: boolean;
            };
          };
        };
      };
    };

    expect(schema.definitions.processor.properties.set.additionalProperties).toBe(true);
  });
});
