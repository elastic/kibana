/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clearWorkflowYamlComputationCache,
  getCachedWorkflowYamlComputationAsync,
  populateWorkflowYamlComputationCacheEntryForTests,
} from './workflow_yaml_computation_cache';

describe('workflow_yaml_computation_cache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    clearWorkflowYamlComputationCache();
    jest.useRealTimers();
  });

  it('keeps recently accessed entries when evicting beyond the max cache size', async () => {
    populateWorkflowYamlComputationCacheEntryForTests('name: keep-me\n');

    for (let index = 0; index < 32; index += 1) {
      populateWorkflowYamlComputationCacheEntryForTests(`name: evictable-${index}\n`);
    }

    populateWorkflowYamlComputationCacheEntryForTests('name: keep-me\n');
    populateWorkflowYamlComputationCacheEntryForTests('name: newest-entry\n');

    await expect(getCachedWorkflowYamlComputationAsync('name: keep-me\n')).resolves.toMatchObject({
      yamlDocument: expect.anything(),
    });
    await expect(
      getCachedWorkflowYamlComputationAsync('name: newest-entry\n')
    ).resolves.toMatchObject({
      yamlDocument: expect.anything(),
    });
    const recomputedEntry = getCachedWorkflowYamlComputationAsync('name: evictable-0\n');
    await jest.runAllTimersAsync();
    await expect(recomputedEntry).resolves.toMatchObject({
      yamlDocument: expect.anything(),
    });
  });
});
