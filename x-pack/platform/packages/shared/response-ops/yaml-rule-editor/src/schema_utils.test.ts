/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJsonSchema, getSchemaProperties } from './schema_utils';

describe('getJsonSchema', () => {
  it('exposes top-level rule properties for autocomplete', () => {
    const root = getJsonSchema();

    expect(root.type).toBe('object');
    expect(root.properties).toBeDefined();
    expect(root.properties?.kind).toBeDefined();
    expect(getSchemaProperties([]).map(({ key }) => key)).toContain('kind');
  });
});
