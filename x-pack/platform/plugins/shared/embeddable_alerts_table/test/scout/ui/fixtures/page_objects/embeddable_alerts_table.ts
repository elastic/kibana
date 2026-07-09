/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { SAVE_CONFIG_BUTTON_SUBJ } from '../../../../../public/constants';

// Dashboard renders the "Alerts" add-panel action as `create-action-<displayName>`.
const ADD_ALERTS_PANEL_ACTION_SUBJ = 'create-action-Alerts';

export class EmbeddableAlertsTablePage {
  public readonly addAlertsPanelAction: Locator;
  public readonly configEditorSaveButton: Locator;
  public readonly alertsTableLoaded: Locator;
  public readonly alertsCount: Locator;
  public readonly alertRowCells: Locator;

  constructor(private readonly page: ScoutPage) {
    this.addAlertsPanelAction = this.page.testSubj.locator(ADD_ALERTS_PANEL_ACTION_SUBJ);
    this.configEditorSaveButton = this.page.testSubj.locator(SAVE_CONFIG_BUTTON_SUBJ);
    this.alertsTableLoaded = this.page.testSubj.locator('alertsTableIsLoaded');
    this.alertsCount = this.page.testSubj.locator('toolbar-alerts-count');
    this.alertRowCells = this.page.testSubj.locator('dataGridRowCell');
  }

  async openConfigEditor() {
    await this.addAlertsPanelAction.click();
    await this.configEditorSaveButton.waitFor({ state: 'visible' });
  }

  // The single available solution auto-selects once rule types load, enabling Save.
  async saveConfig() {
    await this.configEditorSaveButton.click();
    await this.configEditorSaveButton.waitFor({ state: 'hidden' });
  }
}
