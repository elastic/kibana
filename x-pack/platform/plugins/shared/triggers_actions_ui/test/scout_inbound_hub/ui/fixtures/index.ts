/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout';
import type {
  KibanaRole,
  KibanaUrl,
  ScoutPage,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';

export const CONNECTORS_APP_PATH =
  '/app/management/insightsAndAlerting/triggersActionsConnectors' as const;

export const CONNECTORS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { actions: ['all'] }, spaces: ['*'] }],
};

/** Create and edit flyouts for connectors, including the dual connector Receive events and Run actions switches. */
export class ConnectorFlyout {
  readonly nameInput;
  readonly receiveEventsSwitch;
  readonly runActionsSwitch;
  readonly outboundSettings;
  readonly editSecretsCallout;
  readonly createSaveButton;
  readonly saveAndTestButton;
  readonly testTab;
  readonly editSaveButton;
  readonly toastTitle;

  constructor(private readonly page: ScoutPage) {
    this.nameInput = page.testSubj.locator('nameInput');
    this.receiveEventsSwitch = page.testSubj.locator('inbound-events-enabled-switch');
    this.runActionsSwitch = page.testSubj.locator('outbound-actions-enabled-switch');
    this.outboundSettings = page.testSubj.locator('outbound-settings');
    this.editSecretsCallout = page.testSubj.locator('edit-connector-secrets-callout');
    this.createSaveButton = page.testSubj.locator('create-connector-flyout-save-btn');
    this.saveAndTestButton = page.testSubj.locator('create-connector-flyout-save-test-btn');
    this.testTab = page.testSubj.locator('testConnectorTab');
    this.editSaveButton = page.testSubj.locator('edit-connector-flyout-save-btn');
    this.toastTitle = page.testSubj.locator('euiToastHeader__title');
  }

  authTypeCard(authTypeId: string) {
    return this.page.testSubj.locator(`form-generator-field-secrets-${authTypeId}`);
  }

  secretsField(fieldName: string) {
    return this.page.testSubj.locator(`generator-field-secrets-${fieldName}`);
  }

  async openCreate(kbnUrl: KibanaUrl, connectorTypeId: string) {
    await this.page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await this.page.testSubj.click('createConnectorButton');
    const card = this.page.testSubj.locator(`${connectorTypeId}-card`);
    await card.waitFor({ state: 'visible' });
    await card.click();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  /** Sets the Receive events and Run actions switches, filling basic-auth credentials when Run actions stays on. */
  async fillDualSwitches({
    receiveEvents,
    runActions,
    credentials,
  }: {
    receiveEvents: boolean;
    runActions: boolean;
    credentials: { username: string; password: string };
  }) {
    if (receiveEvents) {
      await this.receiveEventsSwitch.click();
      await this.receiveEventsSwitch
        .and(this.page.getByRole('switch', { checked: true }))
        .waitFor({ state: 'visible' });
    }
    if (runActions) {
      await this.secretsField('username').fill(credentials.username);
      await this.secretsField('password').fill(credentials.password);
      return;
    }
    await this.runActionsSwitch.click();
    await this.outboundSettings.waitFor({ state: 'hidden' });
  }

  async openEdit(kbnUrl: KibanaUrl, connectorName: string) {
    await this.page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    const searchBox = this.page.testSubj.locator('actionsList').getByRole('searchbox');
    await searchBox.fill(connectorName);
    await searchBox.press('Enter');
    await this.page.testSubj
      .locator('connectorsTableCell-name')
      .filter({ hasText: connectorName })
      .getByRole('button')
      .click();
    await this.nameInput.waitFor({ state: 'visible' });
  }
}

interface ConnectorFlyoutFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & { connectorFlyout: ConnectorFlyout };
}

export const test = baseTest.extend<ConnectorFlyoutFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use({ ...pageObjects, connectorFlyout: new ConnectorFlyout(page) });
  },
});
