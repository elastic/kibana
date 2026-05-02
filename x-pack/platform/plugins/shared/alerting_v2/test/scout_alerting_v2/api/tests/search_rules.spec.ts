/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, buildCreateRuleData } from '../fixtures';

apiTest.describe('Search rules by name and description', { tag: tags.stateful.classic }, () => {
  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest('should find rules by name prefix', async ({ apiServices }) => {
    for (const name of ['HighCpuAlert', 'DiskUsageAlert']) {
      await apiServices.alertingV2.rules.create(buildCreateRuleData({ metadata: { name } }));
    }

    const result = await apiServices.alertingV2.rules.find({ search: 'HighCpu', perPage: 100 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].metadata.name).toBe('HighCpuAlert');
  });

  apiTest('should find rules by description prefix', async ({ apiServices }) => {
    const rules = [
      { name: 'rule-with-desc', description: 'Monitors memory pressure on production hosts' },
      { name: 'rule-no-match', description: 'Tracks network latency' },
    ];

    for (const { name, description } of rules) {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name, description } })
      );
    }

    const result = await apiServices.alertingV2.rules.find({ search: 'memory', perPage: 100 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].metadata.name).toBe('rule-with-desc');
  });

  apiTest('should AND multiple search terms together', async ({ apiServices }) => {
    const rules = [
      { name: 'prod-cpu-alert', description: 'Monitors production CPU usage' },
      { name: 'dev-cpu-alert', description: 'Monitors development CPU usage' },
    ];

    for (const { name, description } of rules) {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name, description } })
      );
    }

    const result = await apiServices.alertingV2.rules.find({
      search: 'cpu production',
      perPage: 100,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].metadata.name).toBe('prod-cpu-alert');
  });

  apiTest('should return empty results when no fields match', async ({ apiServices }) => {
    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'some-rule' } })
    );
    expect(rule).toMatchObject({ id: expect.stringContaining('') });

    const result = await apiServices.alertingV2.rules.find({
      search: 'nonexistent',
      perPage: 100,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
