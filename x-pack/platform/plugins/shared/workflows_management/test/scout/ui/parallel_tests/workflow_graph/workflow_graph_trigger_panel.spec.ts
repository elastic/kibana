/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';

test.describe(
  'Workflow graph trigger panel — edits apply as they are made',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [EXPERIMENTAL_FEATURES_SETTING]: true,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.graphCanvas.waitFor({ state: 'visible' });
    });

    test.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
    });

    test('a new trigger is on the canvas at once, and Remove trigger takes it out again', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;

      await authoring.openAddTriggerFromEmptyCanvas();
      await authoring.pickTrigger('Manual');

      await expect(page.testSubj.locator('workflowGraphNode-manual')).toBeVisible();
      await expect(page.testSubj.locator('workflowTriggerConfigPanelSave')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowTriggerConfigPanelCancel')).toHaveCount(0);

      await page.testSubj.click('workflowTriggerConfigPanelRemoveTrigger');

      await expect(authoring.triggerPanel).toBeHidden();
      await expect(page.testSubj.locator('workflowGraphNode-manual')).toHaveCount(0);
      await expect(authoring.emptyAddTrigger).toBeVisible();
    });

    test('Reset trigger puts an existing trigger back as it was and closes the panel', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      const every = page.testSubj.locator('workflowTriggerConfigPanelEvery');
      const reset = page.testSubj.locator('workflowTriggerConfigPanelResetTrigger');

      await authoring.openAddTriggerFromEmptyCanvas();
      await authoring.pickTrigger('Scheduled');
      await authoring.closeTriggerPanel();
      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await authoring.triggerPanel.waitFor();
      const original = await every.inputValue();

      await expect(reset).toBeDisabled();
      await authoring.setTriggerEvery('2h');
      await expect(reset).toBeEnabled();
      await reset.click();

      await expect(authoring.triggerPanel).toBeHidden();
      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await expect(every).toHaveValue(original);
    });

    test('keeps what was edited when the panel is closed or the canvas is clicked', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      const every = page.testSubj.locator('workflowTriggerConfigPanelEvery');

      await authoring.openAddTriggerFromEmptyCanvas();
      await authoring.pickTrigger('Scheduled');
      await authoring.setTriggerEvery('2h');
      await authoring.closeTriggerPanel();
      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await expect(every).toHaveValue('2h');

      await authoring.setTriggerEvery('3h');
      // A click on the canvas outside the panel and the nodes.
      await page.testSubj.locator('workflowGraphCanvas').click({ position: { x: 24, y: 420 } });
      await expect(authoring.triggerPanel).toBeHidden();

      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await expect(every).toHaveValue('3h');
    });

    test('scheduled trigger: the Interval field gives examples, and explains an interval that is too short', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      await authoring.addScheduledTrigger();
      const schedule = page.testSubj.locator('workflowTriggerConfigSchedule');
      const summary = page.testSubj.locator('workflowTriggerConfigScheduleSummary');

      await expect(schedule).toContainText('Examples: 90s, 15m, 2h, 1d');
      await expect(schedule).toContainText('use Date & time');
      await expect(summary).toHaveText('Runs every 5 minutes.');

      await authoring.setTriggerEvery('30s');

      await expect(schedule).toContainText('for at least 1 minute');
      await expect(summary).toHaveText('Complete the fields below to see the schedule.');

      await authoring.setTriggerEvery('90s');

      await expect(summary).toHaveText('Runs every 90 seconds.');
    });

    test('scheduled trigger: a Date & time schedule applies as it is made, and is read back when the panel is opened again', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      const field = (part: string) => page.testSubj.locator(`workflowTriggerConfigSchedule${part}`);
      const sentence = 'Every 2 months on the 1st and the 15th at 09:30 Europe/Madrid.';
      await authoring.addScheduledTrigger();

      await authoring.setTriggerCalendarSchedule({
        repeat: 'monthly',
        count: 2,
        tzid: 'Europe/Madrid',
        time: '09:30',
        monthDays: [1, 15],
      });
      await expect(field('Summary')).toHaveText(sentence);

      await authoring.closeTriggerPanel();
      await page.testSubj.locator('workflowGraphNode-scheduled').click();

      await expect(field('Mode-calendar')).toHaveAttribute('aria-pressed', 'true');
      await expect(field('Repeat-monthly')).toHaveAttribute('aria-pressed', 'true');
      await expect(field('Count')).toHaveValue('2');
      await expect(field('Time')).toHaveValue('09:30');
      await expect(field('Timezone')).toHaveValue('Europe/Madrid');
      await expect(field('MonthDay-1')).toHaveAttribute('aria-pressed', 'true');
      await expect(field('MonthDay-15')).toHaveAttribute('aria-pressed', 'true');
      await expect(field('MonthDay-2')).toHaveAttribute('aria-pressed', 'false');
      await expect(field('Summary')).toHaveText(sentence);
    });

    test('scheduled trigger: weekly days are picked on chips, and a repeat keeps its own days when switching', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      await authoring.addScheduledTrigger();
      const field = (part: string) => page.testSubj.locator(`workflowTriggerConfigSchedule${part}`);

      await authoring.setTriggerCalendarSchedule({
        repeat: 'weekly',
        count: 1,
        tzid: 'UTC',
        time: '07:00',
        days: ['MO', 'FR'],
      });
      await expect(field('Summary')).toHaveText('Every week on Monday and Friday at 07:00 UTC.');

      await field('Repeat-monthly').dispatchEvent('click');
      await field('MonthDay-15').click();
      await field('Repeat-weekly').dispatchEvent('click');

      await expect(field('Day-MO')).toHaveAttribute('aria-pressed', 'true');
      await expect(field('Day-FR')).toHaveAttribute('aria-pressed', 'true');
      await expect(field('Day-WE')).toHaveAttribute('aria-pressed', 'false');
      await expect(field('Summary')).toHaveText('Every week on Monday and Friday at 07:00 UTC.');
    });

    test('scheduled trigger: the summary sits above the fields, and asks for a day when none is left', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      await authoring.addScheduledTrigger();
      const field = (part: string) => page.testSubj.locator(`workflowTriggerConfigSchedule${part}`);

      await authoring.setTriggerCalendarSchedule({
        repeat: 'weekly',
        count: 1,
        tzid: 'UTC',
        time: '08:00',
        days: ['WE'],
      });

      const top = (part: string) => field(part).evaluate((el) => el.getBoundingClientRect().top);
      // The summary is sticky: from the top of the panel it is what shows first, above the first field.
      await field('Mode').scrollIntoViewIfNeeded();
      expect(await top('Summary')).toBeLessThan(await top('Repeat'));

      await field('Day-WE').click();

      await expect(page.testSubj.locator('workflowTriggerConfigSchedule')).toContainText(
        'Select at least one day.'
      );
      await expect(field('Summary')).toHaveText('Complete the fields below to see the schedule.');
    });

    test('scheduled trigger: the interval is still there after a visit to Date & time', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      await authoring.addScheduledTrigger();

      await authoring.setTriggerEvery('2h');
      await authoring.setTriggerScheduleMode('calendar');
      await authoring.setTriggerScheduleMode('interval');

      await expect(page.testSubj.locator('workflowTriggerConfigPanelEvery')).toHaveValue('2h');
    });
  }
);
