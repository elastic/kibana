/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { containsECSIdentifierField, filterByECSFields } from './ecs_fields';

describe('containsECSIdentifierFields', () => {
  it('should return true if the array contains all ECS identifier fields', () => {
    const fields = ['host.name', 'service.name', 'log.level', 'other.field', 'ecs.version'];
    expect(containsECSIdentifierField(fields)).toBe(true);
  });

  it('should return false if the array does not contain all ECS identifier fields', () => {
    const fields = ['host.name', 'service.name', 'non.ecs.field1', 'another.non.ecs.field'];
    expect(containsECSIdentifierField(fields)).toBe(false);
  });

  it('should return false for an empty array', () => {
    const fields: string[] = [];
    expect(containsECSIdentifierField(fields)).toBe(false);
  });
});

describe('filterByECSFields', () => {
  it('should filter out non-ECS fields', () => {
    const fields = ['event.dataset', 'host.name', 'random.field', 'other.field'];
    const expected = ['event.dataset', 'host.name'];
    expect(filterByECSFields(fields)).toEqual(expected);
  });

  it('should include fields prefixed with label.', () => {
    const fields = ['event.dataset', 'host.name', 'random.field', 'label.customField'];
    const expected = ['event.dataset', 'host.name', 'label.customField'];
    expect(filterByECSFields(fields)).toEqual(expected);
  });

  it('should return an empty array if no ECS or label. prefixed fields are present', () => {
    const fields = ['random.field', 'another.field'];
    expect(filterByECSFields(fields)).toEqual([]);
  });

  it('should handle an empty array input', () => {
    const fields: string[] = [];
    expect(filterByECSFields(fields)).toEqual([]);
  });
});
