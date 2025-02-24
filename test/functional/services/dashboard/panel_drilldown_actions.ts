/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';

const CREATE_DRILLDOWN_DATA_TEST_SUBJ = 'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN';
const MANAGE_DRILLDOWNS_DATA_TEST_SUBJ = 'embeddablePanelAction-OPEN_FLYOUT_EDIT_DRILLDOWN';

export function DashboardDrilldownPanelActionsProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const { dashboard } = getPageObjects(['dashboard']);

  return new (class DashboardDrilldownPanelActions {
    async expectExistsCreateDrilldownAction() {
      log.debug('expectExistsCreateDrilldownAction');
      await dashboardPanelActions.expectExistsPanelAction(CREATE_DRILLDOWN_DATA_TEST_SUBJ);
    }

    async expectMissingCreateDrilldownAction() {
      log.debug('expectMissingCreateDrilldownAction');
      await dashboardPanelActions.expectMissingPanelAction(CREATE_DRILLDOWN_DATA_TEST_SUBJ);
    }

    async clickCreateDrilldown() {
      log.debug('clickCreateDrilldown');
      await this.expectExistsCreateDrilldownAction();
      await dashboardPanelActions.clickPanelAction(CREATE_DRILLDOWN_DATA_TEST_SUBJ);
    }

    async expectExistsManageDrilldownsAction() {
      log.debug('expectExistsCreateDrilldownAction');
      await dashboardPanelActions.expectExistsPanelAction(MANAGE_DRILLDOWNS_DATA_TEST_SUBJ);
    }

    async expectMissingManageDrilldownsAction() {
      log.debug('expectExistsRemovePanelAction');
      await dashboardPanelActions.expectMissingPanelAction(MANAGE_DRILLDOWNS_DATA_TEST_SUBJ);
    }

    async clickManageDrilldowns() {
      log.debug('clickManageDrilldowns');
      await dashboardPanelActions.clickPanelAction(MANAGE_DRILLDOWNS_DATA_TEST_SUBJ);
    }

    async expectMultipleActionsMenuOpened() {
      log.debug('exceptMultipleActionsMenuOpened');
      await testSubjects.existOrFail('multipleActionsContextMenu');
    }

    async clickActionByText(text: string) {
      log.debug(`clickActionByText: "${text}"`);
      await (await this.getActionWebElementByText(text)).click();
    }

    async getActionHrefByText(text: string) {
      log.debug(`getActionHref: "${text}"`);
      const item = await this.getActionWebElementByText(text);
      return (await item.getAttribute('href')) ?? '';
    }

    async openHrefByText(text: string) {
      log.debug(`openHref: "${text}"`);
      await (await this.getActionWebElementByText(text)).openHref();
    }

    async getActionWebElementByText(text: string): Promise<WebElementWrapper> {
      log.debug(`getActionWebElement: "${text}"`);
      const menu = await testSubjects.find('multipleActionsContextMenu');
      const items = await menu.findAllByCssSelector('[data-test-subj*="embeddablePanelAction-"]');
      for (const item of items) {
        const currentText = await item.getVisibleText();
        if (currentText === text) {
          return item;
        }
      }

      throw new Error(`No action matching text "${text}"`);
    }

    async getPanelDrilldownCount(panelIndex = 0): Promise<number> {
      log.debug('getPanelDrilldownCount');
      const panel = (await dashboard.getDashboardPanels())[panelIndex];

      try {
        const exists = await testSubjects.exists(MANAGE_DRILLDOWNS_DATA_TEST_SUBJ, {
          timeout: 500,
        });
        if (!exists) {
          await dashboardPanelActions.openContextMenu(panel);
          if (!(await testSubjects.exists(MANAGE_DRILLDOWNS_DATA_TEST_SUBJ, { timeout: 500 }))) {
            return 0;
          }
        }
        const manageDrilldownAction = await testSubjects.find(
          MANAGE_DRILLDOWNS_DATA_TEST_SUBJ,
          500
        );

        const count = await (
          await manageDrilldownAction.findByCssSelector('.euiNotificationBadge')
        ).getVisibleText();
        return Number.parseInt(count, 10);
      } catch (e) {
        log.debug('manage drilldowns action not found');
        return 0;
      } finally {
        await dashboardPanelActions.toggleContextMenu(panel);
      }
    }
  })();
}
