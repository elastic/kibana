/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { AlertingApiServicesFixture } from '../../../common/alerting_api_services';
import type { AlertingPageObjects } from '../fixtures';
import { buildCreateRuleData, test } from '../fixtures';

const TEST_INDEX = 'test-compose-discover-recovery-yaml-sync';
const BASE_QUERY = `FROM ${TEST_INDEX}`;
const BREACH_SEGMENT = 'WHERE cpu > 0.9';
const RECOVERY_SEGMENT = 'WHERE cpu < 0.5';
const RECOVERY_SEGMENT_UPDATED = 'WHERE cpu <= 0.5';

const yamlRule = ({
  name,
  recoveryStrategy,
  recoverySegment,
}: {
  name: string;
  recoveryStrategy: 'no_breach' | 'condition' | 'manual';
  recoverySegment?: string;
}) => {
  const lines = [
    'kind: alert',
    'metadata:',
    `  name: ${name}`,
    "time_field: '@timestamp'",
    'schedule:',
    '  every: 5s',
    '  lookback: 1m',
    'query:',
    `  base: ${BASE_QUERY}`,
    '  breach:',
    `    segment: ${BREACH_SEGMENT}`,
    'recovery:',
    `  strategy: ${recoveryStrategy}`,
    ...(recoverySegment ? [`  segment: ${recoverySegment}`] : []),
  ];
  return lines.join('\n');
};

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe(
  'ComposeDiscoverFlyout — recovery strategy YAML <-> GUI round trip (#278327)',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ esClient, apiServices }) => {
      await esClient.indices.create(
        {
          index: TEST_INDEX,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              cpu: { type: 'float' },
            },
          },
        },
        { ignore: [400] }
      );
      await apiServices.alertingV2.rules.cleanUp();
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAlertingV2Editor();
    });

    /**
     * Seeds the rule, then navigates to the rules list — the list is queried
     * fresh on load, so navigating must happen after the rule exists or the
     * empty-state cards render instead of `rulesListTable`.
     */
    const gotoRulesListWithRule = async (pageObjects: AlertingPageObjects) => {
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
    };

    test.afterAll(async ({ esClient, apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
      await esClient.indices.delete({ index: TEST_INDEX }, { ignore: [404] });
    });

    const seedRule = async (apiServices: AlertingApiServicesFixture, name: string) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          time_field: '@timestamp',
          query: { base: BASE_QUERY, breach: { segment: BREACH_SEGMENT } },
          recovery: { strategy: 'no_breach' },
          metadata: { name },
        })
      );
      return rule.id;
    };

    test('recovery tab appears in the YAML-mode sandbox when YAML sets recovery.strategy: condition', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a composed alert rule with default recovery', async () => {
        ruleId = await seedRule(apiServices, 'scout-recovery-yaml-tab-appears');
      });

      await test.step('open the edit flyout and switch to YAML view', async () => {
        await gotoRulesListWithRule(pageObjects);
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await pageObjects.composeDiscover.toggleEditMode('yaml');
        await expect(pageObjects.composeDiscover.yamlBadge).toBeVisible();
      });

      await test.step('the sandbox opens automatically, showing only base/alert tabs', async () => {
        // Entering YAML mode auto-opens the sandbox (childOpen mirrors yamlMode).
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxTab('base')).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxTab('alert')).toBeVisible();
        await expect(pageObjects.composeDiscover.sandboxTab('recovery')).toBeHidden();
      });

      await test.step('set YAML to recovery.strategy: condition with a recovery segment', async () => {
        await pageObjects.composeDiscover.setYamlText(
          yamlRule({
            name: 'scout-recovery-yaml-tab-appears',
            recoveryStrategy: 'condition',
            recoverySegment: RECOVERY_SEGMENT,
          })
        );
      });

      await test.step('the recovery tab appears', async () => {
        await expect(pageObjects.composeDiscover.sandboxTab('recovery')).toBeVisible({
          timeout: 10_000,
        });
      });
    });

    test('a YAML recovery edit reaches the form dropdown (#278327 regression test)', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a composed alert rule with default recovery', async () => {
        ruleId = await seedRule(apiServices, 'scout-recovery-yaml-to-dropdown');
      });

      await test.step('open the edit flyout and advance to the Outcome step', async () => {
        await gotoRulesListWithRule(pageObjects);
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await pageObjects.composeDiscover.clickNext(); // Outcome
        await expect
          .poll(() => pageObjects.composeDiscover.getSelectedRecoveryType())
          .toBe('no_breach');
      });

      await test.step('edit recovery.strategy to "condition" in YAML and return to the form', async () => {
        await pageObjects.composeDiscover.toggleEditMode('yaml');
        await expect(pageObjects.composeDiscover.yamlBadge).toBeVisible();
        await pageObjects.composeDiscover.setYamlText(
          yamlRule({
            name: 'scout-recovery-yaml-to-dropdown',
            recoveryStrategy: 'condition',
            recoverySegment: RECOVERY_SEGMENT,
          })
        );
        await pageObjects.composeDiscover.toggleEditMode('form');
      });

      await test.step('the dropdown and recovery condition reflect the YAML edit', async () => {
        await expect
          .poll(() => pageObjects.composeDiscover.getSelectedRecoveryType())
          .toBe('condition');
        await expect(
          pageObjects.composeDiscover.flyout.getByText('Recovery condition')
        ).toBeVisible();
        await expect(pageObjects.composeDiscover.flyout.getByText(RECOVERY_SEGMENT)).toBeVisible();
      });

      await test.step('editing recovery.strategy to "manual" in YAML also reaches the dropdown', async () => {
        await pageObjects.composeDiscover.toggleEditMode('yaml');
        await pageObjects.composeDiscover.setYamlText(
          yamlRule({ name: 'scout-recovery-yaml-to-dropdown', recoveryStrategy: 'manual' })
        );
        await pageObjects.composeDiscover.toggleEditMode('form');
        await expect
          .poll(() => pageObjects.composeDiscover.getSelectedRecoveryType())
          .toBe('manual');
      });
    });

    test('removing recovery from YAML drops the recovery tab and falls back to the base tab', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a composed alert rule with custom recovery', async () => {
        const rule = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            kind: 'alert',
            time_field: '@timestamp',
            query: { base: BASE_QUERY, breach: { segment: BREACH_SEGMENT } },
            recovery: { strategy: 'condition', segment: RECOVERY_SEGMENT },
            metadata: { name: 'scout-recovery-yaml-tab-drops' },
          })
        );
        ruleId = rule.id;
      });

      await test.step('open the edit flyout, switch to YAML, and select the recovery tab', async () => {
        await gotoRulesListWithRule(pageObjects);
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await pageObjects.composeDiscover.toggleEditMode('yaml');
        // Entering YAML mode auto-opens the sandbox (childOpen mirrors yamlMode).
        await expect(pageObjects.composeDiscover.sandboxTab('recovery')).toBeVisible();
        await pageObjects.composeDiscover.selectSandboxTab('recovery');
        await expect(pageObjects.composeDiscover.sandboxTab('recovery')).toHaveAttribute(
          'aria-selected',
          'true'
        );
      });

      await test.step('reset the recovery block to no_breach in YAML', async () => {
        await pageObjects.composeDiscover.setYamlText(
          yamlRule({
            name: 'scout-recovery-yaml-tab-drops',
            recoveryStrategy: 'no_breach',
          })
        );
      });

      await test.step('the recovery tab disappears and the sandbox falls back to base', async () => {
        await expect(pageObjects.composeDiscover.sandboxTab('recovery')).toBeHidden({
          timeout: 10_000,
        });
        await expect(pageObjects.composeDiscover.sandboxTab('base')).toHaveAttribute(
          'aria-selected',
          'true'
        );
      });
    });

    test('selecting Custom recovery in the form and editing the query reaches the YAML', async ({
      pageObjects,
      apiServices,
    }) => {
      let ruleId: string;

      await test.step('seed a composed alert rule with default recovery', async () => {
        ruleId = await seedRule(apiServices, 'scout-recovery-gui-to-yaml');
      });

      await test.step('open the edit flyout, advance to Outcome, and select Custom recovery', async () => {
        await gotoRulesListWithRule(pageObjects);
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await pageObjects.composeDiscover.clickNext(); // Outcome
        await pageObjects.composeDiscover.selectRecoveryType('condition');
        // Selecting "Custom recovery" auto-opens the sandbox on the recovery tab.
        await expect(pageObjects.composeDiscover.sandboxApplyButton).toBeVisible();
      });

      await test.step('edit the recovery query and apply', async () => {
        await pageObjects.composeDiscover.setRecoveryBlockQuery(RECOVERY_SEGMENT_UPDATED);
        await pageObjects.composeDiscover.clickApply();
      });

      await test.step('switch to YAML and verify the recovery edit is reflected', async () => {
        await pageObjects.composeDiscover.toggleEditMode('yaml');
        await expect
          .poll(() => pageObjects.composeDiscover.getYamlText())
          .toContain('strategy: condition');
        await expect
          .poll(() => pageObjects.composeDiscover.getYamlText())
          .toContain(RECOVERY_SEGMENT_UPDATED);
      });
    });

    test('a YAML recovery edit persists on save', async ({ pageObjects, apiServices }) => {
      let ruleId: string;

      await test.step('seed a composed alert rule with default recovery', async () => {
        ruleId = await seedRule(apiServices, 'scout-recovery-yaml-persists');
      });

      await test.step('open the edit flyout and set recovery.strategy: condition in YAML', async () => {
        await gotoRulesListWithRule(pageObjects);
        await pageObjects.composeDiscover.openEditFlyout(ruleId!);
        await expect(pageObjects.composeDiscover.flyout).toBeVisible();
        await pageObjects.composeDiscover.toggleEditMode('yaml');
        await expect(pageObjects.composeDiscover.yamlBadge).toBeVisible();
        await pageObjects.composeDiscover.setYamlText(
          yamlRule({
            name: 'scout-recovery-yaml-persists',
            recoveryStrategy: 'condition',
            recoverySegment: RECOVERY_SEGMENT,
          })
        );
      });

      await test.step('save from YAML mode', async () => {
        await pageObjects.composeDiscover.clickYamlSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
      });

      await test.step('verify the recovery edit persisted via API', async () => {
        await expect
          .poll(async () => (await apiServices.alertingV2.rules.get(ruleId!)).recovery?.strategy, {
            timeout: 30_000,
          })
          .toBe('condition');
        await expect
          .poll(
            async () => {
              const { recovery } = await apiServices.alertingV2.rules.get(ruleId!);
              return recovery?.strategy === 'condition' ? recovery.segment : undefined;
            },
            { timeout: 30_000 }
          )
          .toBe(RECOVERY_SEGMENT);
      });
    });
  }
);
