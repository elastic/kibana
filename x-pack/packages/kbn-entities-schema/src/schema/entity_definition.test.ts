/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema, entityDefinitionUpdateSchema } from './entity_definition';

const partialEntityDefinition = {
  id: 'entity-1',
  version: '1.0.0',
  name: 'Test Entity',
  type: 'test-type',
  filter: '',
  identityFields: [],
  displayNameTemplate: 'Test Entity',
  history: {
    timestampField: 'timestamp',
    interval: '1d',
    settings: {},
  },
};

describe('entityDefinitionSchema', () => {
  it('should throw an error if both indexPatterns and dataViewId are defined', () => {
    const invalidEntity = {
      ...partialEntityDefinition,
      indexPatterns: ['pattern1'],
      dataViewId: 'dataView1',
    };

    expect(() => entityDefinitionSchema.parse(invalidEntity)).toThrow(
      "dataViewId can't bet set if indexPatterns is defined"
    );
  });

  it('should throw an error if neither indexPatterns nor dataViewId are defined', () => {
    expect(() => entityDefinitionSchema.parse(partialEntityDefinition)).toThrow(
      "dataViewId should be set if indexPatterns isn't"
    );
  });
});

describe('entityDefinitionUpdateSchema', () => {
  it('should throw an error if both indexPatterns and dataViewId are defined in update', () => {
    const invalidEntityUpdate = {
      version: '1.0.1',
      indexPatterns: ['pattern1'],
      dataViewId: 'dataView1',
    };

    expect(() => entityDefinitionUpdateSchema.parse(invalidEntityUpdate)).toThrow(
      "dataViewId can't bet set if indexPatterns is defined"
    );
  });

  it('should not throw an error if neither indexPatterns nor dataViewId are defined in update', () => {
    const validEntityUpdate = {
      version: '1.0.1',
    };

    expect(() => entityDefinitionUpdateSchema.parse(validEntityUpdate)).not.toThrow();
  });
});
