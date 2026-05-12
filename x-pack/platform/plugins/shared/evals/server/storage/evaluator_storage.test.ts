/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVALUATOR_SAVED_OBJECT_TYPE, evaluatorSavedObjectType } from './evaluator_storage';

describe('evaluatorSavedObjectType', () => {
  it('has the correct type name', () => {
    expect(EVALUATOR_SAVED_OBJECT_TYPE).toBe('evals-custom-evaluator');
    expect(evaluatorSavedObjectType.name).toBe('evals-custom-evaluator');
  });

  it('is not hidden (user-facing, space-scoped)', () => {
    expect(evaluatorSavedObjectType.hidden).toBe(false);
  });

  it('is multiple-isolated namespace type', () => {
    expect(evaluatorSavedObjectType.namespaceType).toBe('multiple-isolated');
  });

  it('has the expected mapping properties', () => {
    const { properties } = evaluatorSavedObjectType.mappings;

    expect(properties).toHaveProperty('name');
    expect(properties!.name).toEqual({ type: 'keyword' });

    expect(properties).toHaveProperty('kind');
    expect(properties!.kind).toEqual({ type: 'keyword' });

    expect(properties).toHaveProperty('type');
    expect(properties!.type).toEqual({ type: 'keyword' });

    expect(properties).toHaveProperty('description');
    expect(properties!.description).toEqual({ type: 'text' });

    expect(properties).toHaveProperty('config');
    expect(properties!.config).toEqual({ type: 'object', enabled: false });

    expect(properties).toHaveProperty('version');
    expect(properties!.version).toEqual({ type: 'integer' });

    expect(properties).toHaveProperty('tags');
    expect(properties!.tags).toEqual({ type: 'object', enabled: false });

    expect(properties).toHaveProperty('shared');
    expect(properties!.shared).toEqual({ type: 'boolean' });

    expect(properties).toHaveProperty('created_at');
    expect(properties!.created_at).toEqual({ type: 'date' });

    expect(properties).toHaveProperty('updated_at');
    expect(properties!.updated_at).toEqual({ type: 'date' });
  });

  it('has dynamic set to false', () => {
    expect(evaluatorSavedObjectType.mappings.dynamic).toBe(false);
  });
});
