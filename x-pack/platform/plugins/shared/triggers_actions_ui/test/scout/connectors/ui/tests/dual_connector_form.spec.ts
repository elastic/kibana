/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, type ConnectorFlyout } from '../fixtures/connector_flyout';

// Datadog is a dual connector (inbound events plus actions) with a single credentialed auth
// type, so hiding No authentication leaves its basic-auth fields without a picker.
const DATADOG_TYPE_ID = '.datadog';

const DATADOG_SECRETS = { username: 'scout-api-key', password: 'scout-app-key' };

const CONNECTORS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { actions: ['all'] }, spaces: ['*'] }],
};

const isNamedConnector = (value: unknown): value is { id: string; name: string } => {
  if (typeof value !== 'object' || value === null || !('id' in value) || !('name' in value)) {
    return false;
  }
  return typeof value.id === 'string' && typeof value.name === 'string';
};

const listedConnectors = (value: unknown): Array<{ id: string; name: string }> =>
  Array.isArray(value) ? value.filter(isNamedConnector) : [];

const visibleAfterSave = (
  flyout: ConnectorFlyout,
  connectorName: string,
  signal: 'ingestToken' | 'createdToast'
) => (signal === 'ingestToken' ? flyout.ingestToken : flyout.createdToast(connectorName));

test.describe('Dual connector form', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];
  const createdConnectorNames: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(CONNECTORS_ROLE);
  });

  test.afterAll(async ({ apiServices }) => {
    const listed = listedConnectors(await apiServices.alerting.connectors.getAll());
    const ids = new Set(createdConnectorIds);
    for (const connector of listed) {
      if (createdConnectorNames.includes(connector.name)) {
        ids.add(connector.id);
      }
    }
    await Promise.allSettled([...ids].map((id) => apiServices.alerting.connectors.delete(id)));
  });

  const findSavedConnector = async (apiServices: ApiServicesFixture, name: string) => {
    const listed = listedConnectors(await apiServices.alerting.connectors.getAll());
    const created = listed.find((connector) => connector.name === name);
    expect(created).toBeDefined();
    if (!created) {
      throw new Error(`saved connector ${name} was not found`);
    }
    createdConnectorIds.push(created.id);
    return apiServices.alerting.connectors.get(created.id);
  };

  test('does not offer No authentication in the Datadog auth picker', async ({
    connectorFlyout,
    kbnUrl,
  }) => {
    await connectorFlyout.openCreate(kbnUrl, DATADOG_TYPE_ID);
    await expect(connectorFlyout.secretsField('username')).toBeVisible();
    await expect(connectorFlyout.authTypeCard('none')).toHaveCount(0);
    await expect(connectorFlyout.authTypeCard('basic')).toHaveCount(0);
  });

  test('Run actions switch hides and restores the outbound fields', async ({
    connectorFlyout,
    kbnUrl,
  }) => {
    await connectorFlyout.openCreate(kbnUrl, DATADOG_TYPE_ID);

    await expect(connectorFlyout.receiveEventsSwitch).not.toBeChecked();
    await expect(connectorFlyout.runActionsSwitch).toBeChecked();
    await expect(connectorFlyout.outboundSettings).toBeVisible();
    await expect(connectorFlyout.saveAndTestButton).toBeVisible();

    await connectorFlyout.secretsField('username').fill(DATADOG_SECRETS.username);

    await connectorFlyout.runActionsSwitch.click();
    await expect(connectorFlyout.runActionsSwitch).not.toBeChecked();
    await expect(connectorFlyout.outboundSettings).toBeHidden();
    await expect(connectorFlyout.saveAndTestButton).toBeHidden();
    await expect(connectorFlyout.createSaveButton).toBeVisible();

    await connectorFlyout.runActionsSwitch.click();
    await expect(connectorFlyout.runActionsSwitch).toBeChecked();
    await expect(connectorFlyout.outboundSettings).toBeVisible();
    await expect(connectorFlyout.secretsField('username')).toHaveValue(DATADOG_SECRETS.username);
  });

  // Run actions off saves no authentication and no actions; on saves the credentials and
  // leaves selectedActions unset (all actions).
  const saveCases = [
    {
      label: 'Receive events on, Run actions off',
      slug: 'in-noout',
      receiveEvents: true,
      runActions: false,
      expectedAuthType: 'none',
      expectedSelectedActions: [],
      savedSignal: 'ingestToken' as const,
    },
    {
      label: 'Receive events on, Run actions on',
      slug: 'in-out',
      receiveEvents: true,
      runActions: true,
      expectedAuthType: 'basic',
      expectedSelectedActions: undefined,
      savedSignal: 'ingestToken' as const,
    },
    {
      label: 'Receive events off, Run actions on',
      slug: 'noin-out',
      receiveEvents: false,
      runActions: true,
      expectedAuthType: 'basic',
      expectedSelectedActions: undefined,
      savedSignal: 'createdToast' as const,
    },
    {
      label: 'Receive events off, Run actions off',
      slug: 'noin-noout',
      receiveEvents: false,
      runActions: false,
      expectedAuthType: 'none',
      expectedSelectedActions: [],
      savedSignal: 'createdToast' as const,
    },
  ];

  for (const {
    label,
    slug,
    receiveEvents,
    runActions,
    expectedAuthType,
    expectedSelectedActions,
    savedSignal,
  } of saveCases) {
    test(`saves a Datadog connector with ${label}`, async ({
      connectorFlyout,
      kbnUrl,
      apiServices,
    }) => {
      const connectorName = `scout-datadog-${slug}-${Date.now()}`;
      createdConnectorNames.push(connectorName);

      await connectorFlyout.openCreate(kbnUrl, DATADOG_TYPE_ID);
      await connectorFlyout.nameInput.fill(connectorName);
      await connectorFlyout.fillDualSwitches({
        receiveEvents,
        runActions,
        credentials: DATADOG_SECRETS,
      });

      await expect(connectorFlyout.receiveEventsSwitch).toHaveAttribute(
        'aria-checked',
        String(receiveEvents)
      );
      await expect(connectorFlyout.runActionsSwitch).toHaveAttribute(
        'aria-checked',
        String(runActions)
      );
      await expect(connectorFlyout.createSaveButton).toBeEnabled();
      await connectorFlyout.createSaveButton.click();
      await expect(visibleAfterSave(connectorFlyout, connectorName, savedSignal)).toBeVisible();

      const saved = await findSavedConnector(apiServices, connectorName);
      expect(saved.connector_type_id).toBe(DATADOG_TYPE_ID);
      expect(saved.is_inbound_events_enabled).toBe(receiveEvents);
      expect(saved.config.authType).toBe(expectedAuthType);
      expect(saved.config.selectedActions).toStrictEqual(expectedSelectedActions);
    });
  }

  test('adds credentials to a saved receive-only Datadog connector', async ({
    connectorFlyout,
    kbnUrl,
    apiServices,
  }) => {
    const connectorName = `scout-datadog-receive-only-${Date.now()}`;
    createdConnectorNames.push(connectorName);
    const { id: connectorId } = await apiServices.alerting.connectors.create({
      name: connectorName,
      connectorTypeId: DATADOG_TYPE_ID,
      config: { site: 'datadoghq.com', authType: 'none', selectedActions: [] },
      secrets: { authType: 'none' },
    });
    createdConnectorIds.push(connectorId);

    await connectorFlyout.openEdit(kbnUrl, connectorName);

    await expect(connectorFlyout.runActionsSwitch).not.toBeChecked();
    await expect(connectorFlyout.outboundSettings).toBeHidden();
    await expect(connectorFlyout.editSecretsCallout).toBeHidden();
    await expect(connectorFlyout.testTab).toBeHidden();

    await connectorFlyout.runActionsSwitch.click();
    await expect(connectorFlyout.outboundSettings).toBeVisible();
    await expect(connectorFlyout.testTab).toBeVisible();
    await expect(connectorFlyout.editSecretsCallout).toBeVisible();
    await expect(connectorFlyout.authTypeCard('none')).toHaveCount(0);
    await connectorFlyout.secretsField('username').fill(DATADOG_SECRETS.username);
    await connectorFlyout.secretsField('password').fill(DATADOG_SECRETS.password);

    await expect(connectorFlyout.editSaveButton).toBeEnabled();
    await connectorFlyout.editSaveButton.click();
    await expect(connectorFlyout.updatedToast(connectorName)).toBeVisible();

    const saved = await apiServices.alerting.connectors.get(connectorId);
    expect(saved.config.authType).toBe('basic');
    expect(saved.config.selectedActions).toBeUndefined();
  });
});
