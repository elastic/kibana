/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { AccessPolicyResponse } from '@kbn/access-control-ui';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import CreateConnectorFlyout from '.';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';

jest.mock('../../../lib/action_connector_api', () => ({
  ...jest.requireActual('../../../lib/action_connector_api'),
  loadActionTypes: jest.fn(),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

jest.setTimeout(15_000);

const { loadActionTypes } = jest.requireMock('../../../lib/action_connector_api');

const POLICY_PATH = '/internal/security/access_control/action/_policy';

const POLICY: AccessPolicyResponse = {
  enabled: true,
  general_access: { default: 'use', allowed: ['none', 'use', 'edit'] },
  entry_levels: ['use'],
  operations: { view: { level: 'view' }, use: { level: 'use' }, edit: { level: 'edit' } },
};

const createConnectorResponse = {
  connector_type_id: 'test',
  is_preconfigured: false,
  is_deprecated: false,
  name: 'My test',
  config: { testTextField: 'My text field' },
  secrets: {},
  id: '123',
};

describe('CreateConnectorFlyout with object-level access control', () => {
  let appMockRenderer: AppMockRenderer;
  let policy: AccessPolicyResponse;
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
    validateParams: jest.fn().mockResolvedValue({ errors: {} }),
  });

  const renderAndFillForm = async () => {
    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={jest.fn()}
        onConnectorCreated={jest.fn()}
        onTestConnector={jest.fn()}
      />
    );

    await userEvent.click(await screen.findByTestId(`${actionTypeModel.id}-card`));
    await userEvent.click(await screen.findByTestId('nameInput'));
    await userEvent.paste('My test');
    await userEvent.click(await screen.findByTestId('test-connector-text-field'));
    await userEvent.paste('My text field');
  };

  const getCreateBody = () => {
    const calls = (appMockRenderer.coreStart.http.post as jest.Mock).mock.calls.filter(
      ([path]: [string]) => path.startsWith('/api/actions/connector')
    );
    expect(calls).toHaveLength(1);
    return JSON.parse(calls[0][1].body);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    policy = POLICY;
    loadActionTypes.mockResolvedValue([
      {
        id: actionTypeModel.id,
        enabled: true,
        name: 'Test',
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting'],
      },
    ]);
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };
    appMockRenderer.coreStart.http.get = jest.fn(async (path: string) =>
      path === POLICY_PATH ? policy : {}
    ) as unknown as typeof appMockRenderer.coreStart.http.get;
    appMockRenderer.coreStart.http.post = jest.fn(async (path: string) =>
      path.endsWith('/_suggest_principals') ? { users: [] } : createConnectorResponse
    ) as unknown as typeof appMockRenderer.coreStart.http.post;
    appMockRenderer.coreStart.http.head = jest.fn().mockResolvedValue({});
  });

  it('creates the connector with the access set in the Access section', async () => {
    await renderAndFillForm();

    // The accordion button's accessible name is unreliable: EUI's test IDs are static.
    await userEvent.click(
      within(await screen.findByTestId('connectorAccessSection')).getByRole('heading', {
        name: 'Access',
      })
    );
    await userEvent.click(screen.getByTestId('accessPanelGeneralAccess'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('accessPanelGeneralAccessOption-none'));
    await userEvent.type(
      within(screen.getByTestId('accessPanelPrincipalPicker')).getByRole('combobox'),
      'kibana/svc{enter}'
    );
    expect(screen.getByTestId('connectorAccessSection')).toHaveTextContent(
      'Only people with access, 1 more person'
    );

    await userEvent.click(screen.getByTestId('create-connector-flyout-save-btn'));

    await waitFor(() =>
      expect(getCreateBody()).toEqual({
        name: 'My test',
        config: { testTextField: 'My text field' },
        secrets: {},
        connector_type_id: actionTypeModel.id,
        access_control: {
          general_access: 'none',
          entries: [{ type: 'service_account', id: 'kibana/svc', access: 'use' }],
        },
      })
    );
  });

  it('shows no Access section and sends no access while access control is disabled', async () => {
    policy = { ...POLICY, enabled: false };
    await renderAndFillForm();

    await waitFor(() =>
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(POLICY_PATH)
    );
    expect(screen.queryByTestId('connectorAccessSection')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('create-connector-flyout-save-btn'));

    await waitFor(() => expect(getCreateBody()).not.toHaveProperty('access_control'));
  });
});
