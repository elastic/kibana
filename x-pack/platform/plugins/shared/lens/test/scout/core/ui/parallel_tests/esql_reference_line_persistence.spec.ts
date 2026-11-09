/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  cancelLensInlineEditorAndWaitClosed,
  cleanupEsqlMultiLayerEnvironment,
  configureEsqlMultiLayerEnvironment,
  expectEsqlChartToRender,
  loadFreshEsqlMultiLayerDashboard,
  openInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

const LEFT = 'lnsXY_yReferenceLineLeftPanel';
const RIGHT = 'lnsXY_yReferenceLineRightPanel';
const TRIGGER = 'lns-dimensionTrigger-textBased';
const SHARED_QUERY = 'FROM logstash-* | STATS lower = COUNT(*) / 20, upper = COUNT(*) / 10';
const SECOND_QUERY = 'FROM logstash-* | STATS independent = COUNT(*) / 5';

spaceTest.describe(
  'Lens ES|QL reference line persistence',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await configureEsqlMultiLayerEnvironment(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
      await loadFreshEsqlMultiLayerDashboard({
        scoutSpace,
        browserAuth,
        dashboard: pageObjects.dashboard,
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await cleanupEsqlMultiLayerEnvironment(scoutSpace);
    });

    spaceTest(
      'reloads mixed sources, axis placement, styles and independent layer queries',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;
        const panelId = testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA;
        await openInlineEditorAndWaitVisible(pageObjects, panelId);
        const dataQuery = await lens.workspace.getEsqlQuery();

        await spaceTest.step('configure two axes and a query reference layer', async () => {
          await lens.dimensions.setTextBasedDimensionField('lnsXY_yDimensionPanel', 'COUNT(*)');
          await lens.dimensions.openDimensionEditor(`lnsXY_yDimensionPanel > ${TRIGGER}`, 0, 1);
          await lens.dimensions.changeAxisSide('right', { inline: true });
          await lens.closeDimensionEditor();
          await lens.layers.createLayer('referenceLine', undefined, {
            referenceLineSource: 'esql',
          });
          await lens.layers.ensureLayerTabIsActive(1);
          await lens.workspace.submitEsqlQuery(SHARED_QUERY);

          await lens.dimensions.openDimensionEditor(`${RIGHT} > lns-empty-dimension`, 1);
          await lens.dimensions.selectTextBasedDimensionField('lower');
          await lens.style.setReferenceLineFillBelow();
          await lens.style.setAnnotationTextVisibility('name');
          await lens.style.setReferenceLineIcon('Bell');
          await lens.closeDimensionEditor();
          await expect(lens.dimensions.getDimensionTriggersLocator(RIGHT)).toHaveText('lower');
          await expectEsqlChartToRender(dashboard, panelId);

          await lens.dimensions.openDimensionEditor(`${RIGHT} > lns-empty-dimension`, 1);
          await lens.dimensions.selectTextBasedDimensionField('upper');
          await lens.closeDimensionEditor();
          await expect(lens.dimensions.getDimensionTriggersLocator(RIGHT)).toHaveText([
            'lower',
            'upper',
          ]);
        });

        await spaceTest.step('add a second reference layer with its own query', async () => {
          await lens.layers.activateLayerTab(0);
          await lens.layers.createLayer('referenceLine', undefined, {
            referenceLineSource: 'esql',
          });
          await lens.layers.ensureLayerTabIsActive(2);
          await lens.workspace.submitEsqlQuery(SECOND_QUERY);
          await lens.dimensions.openDimensionEditor(`${LEFT} > lns-empty-dimension`, 2);
          await lens.dimensions.selectTextBasedDimensionField('independent');
          await expect
            .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
            .toStrictEqual(['independent']);
          await lens.closeDimensionEditor();
          await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText('independent');
          await expectEsqlChartToRender(dashboard, panelId);
        });

        await spaceTest.step('add a separate static reference layer', async () => {
          await lens.layers.createLayer('referenceLine', undefined, {
            referenceLineSource: 'static',
          });
          await lens.layers.ensureLayerTabIsActive(3);
          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toHaveCount(0);
          await lens.dimensions.openDimensionEditor(`${LEFT} > lns-dimensionTrigger`, 3);
          await lens.workspace.setInputValue('lns-indexPattern-static_value-input', '123');
          await lens.closeDimensionEditor();
          await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText(
            'Static value: 123'
          );
        });

        await spaceTest.step('apply, save and reload the dashboard', async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.saveChangesToExistingDashboard();
          await page.reload();
          await dashboard.waitForRenderComplete();
          await expectEsqlChartToRender(dashboard, panelId);
          const panel = dashboard.getPanelByEmbeddableId(panelId);
          await expect(panel.getByTestId('xyVisAnnotationText')).toHaveText('lower');
          await expect(panel.getByTestId('xyVisAnnotationIcon')).toBeVisible();
          await dashboard.ensureEditMode();
          await openInlineEditorAndWaitVisible(pageObjects, panelId);
          expect(await lens.layers.getLayerCount()).toBe(4);
          await expect(lens.applyFlyoutButton).toBeDisabled();
        });

        await spaceTest.step('verify saved queries, mixed dimensions and styles', async () => {
          await lens.layers.activateLayerTab(0);
          expect(await lens.workspace.getEsqlQuery()).toBe(dataQuery);
          await lens.layers.activateLayerTab(1);
          expect(await lens.workspace.getEsqlQuery()).toBe(SHARED_QUERY);
          await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveCount(0);
          await expect(lens.dimensions.getDimensionTriggersLocator(RIGHT)).toHaveText([
            'lower',
            'upper',
          ]);
          await lens.dimensions.openDimensionEditor(`${RIGHT} > ${TRIGGER}`, 1);
          await expect(lens.dimensions.esqlTab).toHaveCount(0);
          await expect(lens.dimensions.staticValueTab).toHaveCount(0);
          await expect
            .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
            .toStrictEqual(['lower']);
          await expect(lens.style.referenceLineFillBelowButton).toHaveAttribute(
            'aria-pressed',
            'true'
          );
          await expect
            .poll(() => page.components.comboBox('lns-icon-select').getSelectedOptions())
            .toStrictEqual(['Bell']);
          await lens.closeDimensionEditor();

          await lens.layers.activateLayerTab(3);
          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toHaveCount(0);
          await lens.dimensions.openDimensionEditor(`${LEFT} > lns-dimensionTrigger`, 3);
          await expect(lens.dimensions.staticValueTab).toHaveCount(0);
          await expect(page.testSubj.locator('lns-indexPattern-static_value-input')).toHaveValue(
            '123'
          );
          await lens.closeDimensionEditor();
          await lens.layers.activateLayerTab(2);
          expect(await lens.workspace.getEsqlQuery()).toBe(SECOND_QUERY);
          await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText('independent');
          await expect(lens.applyFlyoutButton).toBeDisabled();
        });

        await spaceTest.step('enable apply only after editing a persisted query line', async () => {
          await lens.layers.activateLayerTab(1);
          await lens.dimensions.openDimensionEditor(`${RIGHT} > ${TRIGGER}`, 1);
          await lens.dimensions.selectTextBasedDimensionField('upper');
          await lens.closeDimensionEditor();
          await expect(lens.applyFlyoutButton).toBeEnabled();
          await expectEsqlChartToRender(dashboard, panelId);
        });

        await cancelLensInlineEditorAndWaitClosed({ lens });
      }
    );
  }
);
