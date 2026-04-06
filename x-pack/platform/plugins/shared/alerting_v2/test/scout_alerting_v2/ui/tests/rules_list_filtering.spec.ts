/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { createRule, disableRules, deleteRules } from '../../helpers';

test.describe('Rules list filtering', { tag: tags.stateful.classic }, () => {
  // eslint-disable-next-line @kbn/eslint/scout_no_describe_configure -- serial mode ensures a single beforeAll seed against shared Elasticsearch (parallel workers would duplicate rules).
  test.describe.configure({ mode: 'serial' });

  const ruleIds: string[] = [];

  test.beforeAll(async ({ kbnClient }) => {
    ruleIds.push(
      await createRule(kbnClient, {
        name: 'prod-cpu-alert',
        kind: 'alert',
        labels: ['prod', 'infra'],
      })
    );
    ruleIds.push(
      await createRule(kbnClient, {
        name: 'staging-network-signal',
        kind: 'signal',
        labels: ['staging', 'network'],
      })
    );
    ruleIds.push(
      await createRule(kbnClient, {
        name: 'prod-latency-alert',
        kind: 'alert',
        labels: ['prod', 'observability'],
      })
    );
    ruleIds.push(
      await createRule(kbnClient, {
        name: 'dev-error-signal',
        kind: 'signal',
        labels: ['dev', 'security'],
      })
    );
    ruleIds.push(
      await createRule(kbnClient, {
        name: 'prod-disk-alert',
        kind: 'alert',
        labels: ['prod', 'infra'],
      })
    );
    ruleIds.push(
      await createRule(kbnClient, {
        name: 'staging-memory-alert',
        kind: 'alert',
        labels: ['staging', 'infra'],
      })
    );
    ruleIds.push(await createRule(kbnClient, { name: 'unlabeled-rule', kind: 'alert' }));

    await disableRules(kbnClient, [ruleIds[1], ruleIds[3]]);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesList.goto();
  });

  test.afterAll(async ({ kbnClient }) => {
    await deleteRules(kbnClient, ruleIds);
  });

  test('displays all seeded rules by default', async ({ pageObjects }) => {
    await expect(pageObjects.rulesList.showingLabel()).toContainText('7');
    const count = await pageObjects.rulesList.getVisibleRuleCount();
    expect(count).toBe(7);
  });

  test('search bar filters rules by name', async ({ pageObjects }) => {
    await test.step('search for "prod"', async () => {
      await pageObjects.rulesList.search('prod');
    });

    await test.step('verify only prod rules are visible', async () => {
      const names = await pageObjects.rulesList.getVisibleRuleNames();
      expect(names).toHaveLength(3);
      for (const name of names) {
        expect(name.toLowerCase()).toContain('prod');
      }
    });

    await test.step('clear search and verify all rules return', async () => {
      await pageObjects.rulesList.clearSearch();
      const count = await pageObjects.rulesList.getVisibleRuleCount();
      expect(count).toBe(7);
    });
  });

  test('status filter shows only enabled rules', async ({ pageObjects }) => {
    await test.step('select Enabled status filter', async () => {
      await pageObjects.rulesList.selectStatusFilter('true');
    });

    await test.step('verify only enabled rules are shown', async () => {
      await expect(pageObjects.rulesList.showingLabel()).toContainText('5');
      const count = await pageObjects.rulesList.getVisibleRuleCount();
      expect(count).toBe(5);
      await expect(pageObjects.rulesList.enabledStatusBadges()).toHaveCount(5);
      await expect(pageObjects.rulesList.disabledStatusBadges()).toHaveCount(0);
    });

    await test.step('clear filter', async () => {
      await pageObjects.rulesList.clearStatusFilter();
      await expect(pageObjects.rulesList.showingLabel()).toContainText('7');
      const count = await pageObjects.rulesList.getVisibleRuleCount();
      expect(count).toBe(7);
      await expect(pageObjects.rulesList.enabledStatusBadges()).toHaveCount(5);
      await expect(pageObjects.rulesList.disabledStatusBadges()).toHaveCount(2);
    });
  });

  test('status filter shows only disabled rules', async ({ pageObjects }) => {
    await pageObjects.rulesList.selectStatusFilter('false');

    await expect(pageObjects.rulesList.showingLabel()).toContainText('2');
    const names = await pageObjects.rulesList.getVisibleRuleNames();
    expect(names).toHaveLength(2);
    expect(names).toContain('staging-network-signal');
    expect(names).toContain('dev-error-signal');
    expect(await pageObjects.rulesList.getVisibleRuleCount()).toBe(2);
    await expect(pageObjects.rulesList.disabledStatusBadges()).toHaveCount(2);
    await expect(pageObjects.rulesList.enabledStatusBadges()).toHaveCount(0);

    await pageObjects.rulesList.clearStatusFilter();
    await expect(pageObjects.rulesList.showingLabel()).toContainText('7');
    expect(await pageObjects.rulesList.getVisibleRuleCount()).toBe(7);
    await expect(pageObjects.rulesList.enabledStatusBadges()).toHaveCount(5);
    await expect(pageObjects.rulesList.disabledStatusBadges()).toHaveCount(2);
  });

  test('mode filter shows only alert rules', async ({ pageObjects }) => {
    await pageObjects.rulesList.selectModeFilter('alert');

    const count = await pageObjects.rulesList.getVisibleRuleCount();
    expect(count).toBe(5);
    const names = await pageObjects.rulesList.getVisibleRuleNames();
    expect(names).not.toContain('staging-network-signal');
    expect(names).not.toContain('dev-error-signal');

    await pageObjects.rulesList.clearModeFilter();
  });

  test('mode filter shows only signal rules', async ({ pageObjects }) => {
    await pageObjects.rulesList.selectModeFilter('signal');

    const names = await pageObjects.rulesList.getVisibleRuleNames();
    expect(names).toHaveLength(2);
    expect(names).toContain('staging-network-signal');
    expect(names).toContain('dev-error-signal');

    await pageObjects.rulesList.clearModeFilter();
  });

  test('tags filter narrows results to rules with selected tag', async ({ pageObjects }) => {
    await test.step('select "prod" tag', async () => {
      await pageObjects.rulesList.selectTagFilter('prod');
    });

    await test.step('verify only prod-labeled rules appear', async () => {
      const names = await pageObjects.rulesList.getVisibleRuleNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('prod-cpu-alert');
      expect(names).toContain('prod-latency-alert');
      expect(names).toContain('prod-disk-alert');
    });

    await test.step('clear tag filter', async () => {
      await pageObjects.rulesList.clearTagFilters();
      const count = await pageObjects.rulesList.getVisibleRuleCount();
      expect(count).toBe(7);
    });
  });

  test('selecting multiple tags shows rules matching any selected tag', async ({ pageObjects }) => {
    await pageObjects.rulesList.selectTagFilters(['infra', 'security']);

    const names = await pageObjects.rulesList.getVisibleRuleNames();
    expect(names).toContain('prod-cpu-alert');
    expect(names).toContain('prod-disk-alert');
    expect(names).toContain('staging-memory-alert');
    expect(names).toContain('dev-error-signal');
    expect(names).not.toContain('unlabeled-rule');

    await pageObjects.rulesList.clearTagFilters();
  });

  test('combining search with filters narrows results', async ({ pageObjects }) => {
    await test.step('apply mode filter for alert rules', async () => {
      await pageObjects.rulesList.selectModeFilter('alert');
    });

    await test.step('search for "staging"', async () => {
      await pageObjects.rulesList.search('staging');
    });

    await test.step('verify only staging alert rules appear', async () => {
      const names = await pageObjects.rulesList.getVisibleRuleNames();
      expect(names).toHaveLength(1);
      expect(names).toContain('staging-memory-alert');
    });

    await test.step('clean up filters', async () => {
      await pageObjects.rulesList.clearSearch();
      await pageObjects.rulesList.clearModeFilter();
    });
  });

  test('combining status and mode filters works together', async ({ pageObjects }) => {
    await test.step('filter to disabled signal rules', async () => {
      await pageObjects.rulesList.selectStatusFilter('false');
      await pageObjects.rulesList.selectModeFilter('signal');
    });

    await test.step('verify both disabled signal rules appear', async () => {
      const names = await pageObjects.rulesList.getVisibleRuleNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('staging-network-signal');
      expect(names).toContain('dev-error-signal');
    });

    await test.step('clean up filters', async () => {
      await pageObjects.rulesList.clearStatusFilter();
      await pageObjects.rulesList.clearModeFilter();
    });
  });

  test('no results message shown when filters match nothing', async ({ pageObjects, page }) => {
    await test.step('search for a term that matches no rules', async () => {
      // Alphanumeric only: hyphenated terms can produce invalid KQL and a 400 instead of an empty list.
      await pageObjects.rulesList.search('zzznonexistentruleunique');
    });

    await test.step('verify empty state message', async () => {
      await expect(page.getByText('No rules match your search or filters.')).toBeVisible();
    });

    await test.step('clean up', async () => {
      await pageObjects.rulesList.clearSearch();
    });
  });
});
