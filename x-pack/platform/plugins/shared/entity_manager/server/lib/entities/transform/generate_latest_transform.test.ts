/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition } from '../helpers/fixtures/entity_definition';
import { generateLatestTransform } from './generate_latest_transform';

describe('generateLatestTransform(definition)', () => {
  it('should generate a valid latest transform', () => {
    const transform = generateLatestTransform(entityDefinition);
    expect(transform).toMatchSnapshot();
  });

  it('should include runtime_mappings in source when provided in definition', () => {
    const definitionWithRuntimeMappings = {
      ...entityDefinition,
      runtimeMappings: {
        _computed_field: {
          type: 'keyword',
          script: {
            source: 'emit(doc["some.field"].value)',
          },
        },
      },
    };

    const transform = generateLatestTransform(definitionWithRuntimeMappings);

    expect(transform.source.runtime_mappings).toBeDefined();
    expect(transform.source.runtime_mappings).toEqual({
      _computed_field: {
        type: 'keyword',
        script: {
          source: 'emit(doc["some.field"].value)',
        },
      },
    });
  });

  it('should not include runtime_mappings in source when not provided in definition', () => {
    const transform = generateLatestTransform(entityDefinition);

    expect(transform.source.runtime_mappings).toBeUndefined();
  });
});
