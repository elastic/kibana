/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulletSubtype } from '@elastic/charts';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

spaceTest.describe('Lens gauge shapes', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    enableChartDebug: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  // One spaceTest with steps (not separate cases): later shape/table checks depend on the
  // edited gauge config from earlier steps — same sequential state as FTR gauge.ts.
  spaceTest(
    'switches to gauge, edits dimensions/styles, and falls back to table',
    async ({ page, pageObjects }) => {
      const { lens } = pageObjects;

      const getGaugeBullet = async () => {
        const debugState = await lens.getCurrentChartDebugState('gaugeChart');
        return debugState.bullet?.rows[0][0];
      };

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.waitForVisualization('xyVisChart');

      await spaceTest.step('switch to gauge and render defaults', async () => {
        await lens.switchToVisualization('lnsGauge', { search: 'gauge' });
        await lens.waitForVisualization('gaugeChart');
        const debugData = await getGaugeBullet();
        expect(debugData?.subtype).toBe(BulletSubtype.horizontal);
        expect(debugData?.title).toBe('Average of bytes');
        // Exact metric/domain values → #280444.
        expect(debugData?.value).toBeGreaterThan(0);
        expect(debugData?.domain?.[0]).toBeLessThan(debugData?.domain?.[1] ?? 0);
      });

      await spaceTest.step('reflect edits for gauge', async () => {
        await lens.configureDimension({
          dimension: 'lnsGauge_metricDimensionPanel > lns-dimensionTrigger',
          operation: 'count',
          field: 'Records',
          isPreviousIncompatible: false,
          keepOpen: true,
        });
        await lens.setEuiSwitch('lnsDynamicColoringGaugeSwitch', true);
        await lens.closeDimensionEditor();

        await lens.openStyleSettingsFlyout();
        const { violations: styleViolations } = await page.checkA11y({
          include: ['[data-test-subj="lnsApp"]'],
        });
        expect(styleViolations).toHaveLength(0);
        await lens.setInputValue('lnsToolbarGaugeLabelMajor', 'custom title');
        await lens.setGaugeMinorLabelMode('custom');
        await lens.setInputValue('lnsToolbarGaugeLabelMinor', 'custom subtitle');
        // Wait for debounced title/subtitle to reach the chart before closing the flyout.
        await expect.poll(async () => (await getGaugeBullet())?.title).toBe('custom title');
        await expect.poll(async () => (await getGaugeBullet())?.subtitle).toBe('custom subtitle');
        await lens.closeFlyoutWithBackButton();

        await lens.waitForVisualization('gaugeChart');
        await lens.openDimensionEditor('lnsGauge_goalDimensionPanel > lns-empty-dimension');
        await lens.waitForStaticValueInput();
        await lens.waitForVisualization('gaugeChart');
        await lens.closeDimensionEditor();

        await lens.openDimensionEditor(
          'lnsGauge_minDimensionPanel > lns-empty-dimension-suggested-value'
        );
        await lens.setInputValue('lns-indexPattern-static_value-input', '1000');
        await expect.poll(async () => (await getGaugeBullet())?.domain?.[0]).toBe(1000);
        await lens.closeDimensionEditor();

        await lens.openDimensionEditor(
          'lnsGauge_maxDimensionPanel > lns-empty-dimension-suggested-value'
        );
        await lens.setInputValue('lns-indexPattern-static_value-input', '25000');
        await expect.poll(async () => (await getGaugeBullet())?.domain?.[1]).toBe(25000);
        await lens.closeDimensionEditor();

        const debugData = await getGaugeBullet();
        expect(debugData?.subtype).toBe(BulletSubtype.horizontal);
        expect(debugData?.title).toBe('custom title');
        expect(debugData?.subtitle).toBe('custom subtitle');
        // Exact value/target → #280444. UI asserts edits applied (domain + positive metric).
        expect(debugData?.value).toBeGreaterThan(0);
        expect(debugData?.target).toBeGreaterThan(0);
        expect(debugData?.domain).toStrictEqual([1000, 25000]);
      });

      await spaceTest.step('switch to vertical bullet without losing configuration', async () => {
        await lens.setGaugeOrientation('vertical');
        const debugData = await getGaugeBullet();
        expect(debugData?.subtype).toBe(BulletSubtype.vertical);
        expect(debugData?.title).toBe('custom title');
        expect(debugData?.subtitle).toBe('custom subtitle');
        expect(debugData?.domain).toStrictEqual([1000, 25000]);
      });

      await spaceTest.step('switch to minor arc without losing configuration', async () => {
        await lens.setGaugeShape('Minor arc');
        const debugData = await getGaugeBullet();
        expect(debugData?.subtype).toBe(BulletSubtype.halfCircle);
        expect(debugData?.title).toBe('custom title');
        expect(debugData?.subtitle).toBe('custom subtitle');
        expect(debugData?.domain).toStrictEqual([1000, 25000]);
      });

      await spaceTest.step('switch to major arc without losing configuration', async () => {
        await lens.setGaugeShape('Major arc');
        const debugData = await getGaugeBullet();
        expect(debugData?.subtype).toBe(BulletSubtype.twoThirdsCircle);
        expect(debugData?.title).toBe('custom title');
        expect(debugData?.subtitle).toBe('custom subtitle');
        expect(debugData?.domain).toStrictEqual([1000, 25000]);
      });

      await spaceTest.step('switch to circle without losing configuration', async () => {
        await lens.setGaugeShape('Circle');
        const debugData = await getGaugeBullet();
        expect(debugData?.subtype).toBe(BulletSubtype.circle);
        expect(debugData?.title).toBe('custom title');
        expect(debugData?.subtitle).toBe('custom subtitle');
        expect(debugData?.domain).toStrictEqual([1000, 25000]);
      });

      await spaceTest.step('switch to table and drop unsupported static values', async () => {
        await lens.switchToVisualization('lnsDatatable');
        await expect.poll(async () => lens.getCountOfDatatableColumns()).toBe(1);
        expect(await lens.getDatatableHeaderText(0)).toBe('Count of records');
      });
    }
  );
});
