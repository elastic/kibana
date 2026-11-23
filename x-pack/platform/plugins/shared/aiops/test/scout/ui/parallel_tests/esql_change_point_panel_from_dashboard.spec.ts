/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_ESQL } from '@kbn/esql-utils';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ensureDataView } from '../fixtures/data_views';
import { spaceTest } from '../fixtures';

const PANEL_RENDER_TIMEOUT = 30_000;

spaceTest.describe('ES|QL change point panels on dashboard', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC', [ENABLE_ESQL]: true });
    await ensureDataView(apiServices, 'ft_ecommerce', 'order_date', scoutSpace.id);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await apiServices.dataViews.deleteByTitle('ft_ecommerce', scoutSpace.id);
    await scoutSpace.uiSettings.unset('dateFormat:tz');
    await scoutSpace.uiSettings.unset(ENABLE_ESQL);
  });

  spaceTest(
    'previews and adds Charts and Table panels from Dashboard, then edits the chart panel in place',
    async ({ page, pageObjects, scoutSpace }) => {
      const dashboardTitle = `ESQL change point ${scoutSpace.id} ${Date.now()}`;
      const initialChartTitle = 'Change point: avg(products.discount_amount)';
      const editedChartTitle =
        'Change point: avg(products.discount_amount) split by "geoip.city_name"';

      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.datePicker.setAbsoluteRange({
        from: 'Jun 1, 2023 @ 00:00:00.000',
        to: 'Jul 15, 2023 @ 00:00:00.000',
      });

      await spaceTest.step('previews and adds a Charts change_point_grid panel', async () => {
        await pageObjects.changePointChart.openInitializer();
        await expect(pageObjects.changePointChart.confirmButton).toBeDisabled();

        await pageObjects.changePointChart.selectEmbeddableDataView('ft_ecommerce');
        await pageObjects.changePointChart.selectMetricField('products.discount_amount');

        await expect(pageObjects.changePointChart.previewReady).toBeVisible({
          timeout: PANEL_RENDER_TIMEOUT,
        });
        await expect(pageObjects.changePointChart.confirmButton).toBeEnabled();

        await pageObjects.changePointChart.confirmInitializer();
        await expect(
          pageObjects.dashboard.getPanelTitlesLocator().filter({ hasText: initialChartTitle })
        ).toBeVisible();
        await expect(pageObjects.changePointChart.changePointGridRendered).toBeVisible({
          timeout: PANEL_RENDER_TIMEOUT,
        });
      });

      await spaceTest.step('previews and adds a Discover ES|QL Table panel', async () => {
        await pageObjects.changePointChart.openInitializer();
        await pageObjects.changePointChart.selectViewType('Table');
        await pageObjects.changePointChart.selectEmbeddableDataView('ft_ecommerce');
        await pageObjects.changePointChart.selectMetricField('products.discount_amount');

        await expect(pageObjects.changePointChart.previewReady).toBeVisible({
          timeout: PANEL_RENDER_TIMEOUT,
        });
        await expect(pageObjects.changePointChart.confirmButton).toBeEnabled();

        await pageObjects.changePointChart.confirmInitializer();
        await expect(page.testSubj.locator('unifiedDataTable')).toBeVisible({
          timeout: PANEL_RENDER_TIMEOUT,
        });
        expect(await pageObjects.dashboard.getPanelCount()).toBe(2);
      });

      await spaceTest.step(
        'saves the dashboard and edits the chart panel in place via the panel menu',
        async () => {
          await pageObjects.dashboard.saveDashboard(dashboardTitle);
          await pageObjects.dashboard.ensureEditMode();

          await pageObjects.dashboard.clickPanelAction(
            'embeddablePanelAction-edit-change-point-grid',
            initialChartTitle
          );
          await expect(pageObjects.changePointChart.initializer).toBeVisible();

          // View type selector is locked when editing a chart panel
          await expect(
            pageObjects.changePointChart.viewTypeSelector.getByRole('button', {
              name: 'Charts',
              exact: true,
            })
          ).toBeDisabled();

          await pageObjects.changePointChart.selectSplitField('geoip.city_name');
          await expect(pageObjects.changePointChart.previewReady).toBeVisible({
            timeout: PANEL_RENDER_TIMEOUT,
          });
          await expect(pageObjects.changePointChart.confirmButton).toBeEnabled();

          await pageObjects.changePointChart.confirmInitializer();
          await expect(
            pageObjects.dashboard.getPanelTitlesLocator().filter({ hasText: editedChartTitle })
          ).toBeVisible();
          expect(await pageObjects.dashboard.getPanelCount()).toBe(2);
        }
      );
    }
  );
});
