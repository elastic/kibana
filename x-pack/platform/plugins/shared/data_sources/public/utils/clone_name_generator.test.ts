/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateCloneName } from './clone_name_generator';
import type { ActiveSource } from '../types/connector';

const createMockSource = (name: string): ActiveSource => ({
  id: `source-${name}`,
  name,
  type: 'github',
  stackConnectors: ['connector-1'],
  workflows: [],
  agentTools: [],
});

describe('generateCloneName', () => {
  it('should generate "Name" when no sources exist', () => {
    const result = generateCloneName('Github', []);
    expect(result).toBe('Github');
  });

  it('should generate "Name 1" when only base name exists', () => {
    const existingSources = [createMockSource('Github')];
    const result = generateCloneName('Github', existingSources);
    expect(result).toBe('Github 1');
  });

  it('should generate "Name 2" when "Name 1" exists', () => {
    const existingSources = [createMockSource('Github 1')];
    const result = generateCloneName('Github', existingSources);
    expect(result).toBe('Github 2');
  });

  it('should fill gaps in the sequence', () => {
    const existingSources = [createMockSource('Github 5')];
    const result = generateCloneName('Github 5', existingSources);
    expect(result).toBe('Github 1');
  });

  it('should fill gaps when cloning numbered source', () => {
    const existingSources = [createMockSource('Github 2'), createMockSource('Github 5')];
    const result = generateCloneName('Github 5', existingSources);
    expect(result).toBe('Github 1');
  });

  it('should continue after gap is filled', () => {
    const existingSources = [createMockSource('Github 1'), createMockSource('Github 5')];
    const result = generateCloneName('Github 5', existingSources);
    expect(result).toBe('Github 2');
  });

  it('should handle mixed sources with and without numbers', () => {
    const existingSources = [
      createMockSource('Github'),
      createMockSource('Github 1'),
      createMockSource('Github 3'),
    ];
    const result = generateCloneName('Github', existingSources);
    expect(result).toBe('Github 2'); // Fills the gap
  });
});
