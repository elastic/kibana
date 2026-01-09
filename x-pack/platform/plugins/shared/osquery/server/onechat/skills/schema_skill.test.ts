/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSchemaSkill } from './schema_skill';
import type { GetOsqueryAppContextFn } from './utils';

describe('getSchemaSkill', () => {
  const mockGetOsqueryContext: GetOsqueryAppContextFn = () => null;

  it('should create a skill with correct namespace', () => {
    const skill = getSchemaSkill(mockGetOsqueryContext);
    expect(skill.namespace).toBe('osquery.schema');
    expect(skill.name).toBe('Osquery Schema');
    expect(skill.description).toBe('Discover osquery table and column schemas');
  });

  it('should include get_schema tool', () => {
    const skill = getSchemaSkill(mockGetOsqueryContext);
    expect(skill.tools).toHaveLength(1);
    expect(skill.tools[0].name).toBe('get_schema');
  });

  it('should have instructional content', () => {
    const skill = getSchemaSkill(mockGetOsqueryContext);
    expect(skill.content).toContain('# Osquery Schema Guide');
    expect(skill.content).toContain('get_schema');
  });
});





