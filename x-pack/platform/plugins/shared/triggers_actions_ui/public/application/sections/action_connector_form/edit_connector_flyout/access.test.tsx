/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import type { AccessPolicyResponse, AccessStateResponse } from '@kbn/access-control-ui';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import EditConnectorFlyout from '.';
import type { ActionConnector, GenericValidationResult } from '../../../../types';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';

jest.setTimeout(15_000);

const POLICY_PATH = '/internal/security/access_control/action/_policy';
const OBJECT_PATH = '/internal/security/access_control/action/123';

const POLICY: AccessPolicyResponse = {
  enabled: true,
  general_access: { default: 'use', allowed: ['none', 'use', 'edit'] },
  entry_levels: ['use'],
  operations: {
    view: { level: 'view' },
    use: { level: 'use' },
    edit: { level: 'edit' },
    delete: { level: 'edit' },
  },
};

const ACCESS: AccessStateResponse = {
  type: 'action',
  id: '123',
  version: 'v1',
  state: 'valid',
  restricted: false,
  is_owner: true,
  permissions: ['view', 'use', 'edit', 'delete', 'manage_access', 'transfer'],
  via_recovery: [],
  can_claim: false,
  current_principal: { type: 'user', id: 'u_owner' },
  acl: {
    version: [1],
    owner: { type: ['user'], id: ['u_owner'] },
    general_access: ['use'],
    entries: [],
  },
  profiles: [],
};

const ACTION_TYPES = [
  {
    id: '.test',
    name: 'Test',
    enabled: true,
    enabled_in_config: true,
    enabled_in_license: true,
    supported_feature_ids: [],
    minimum_license_required: 'basic',
    is_system_action_type: false,
    is_deprecated: false,
  },
];

const connector: ActionConnector = createMockActionConnector({
  id: '123',
  name: 'My test',
  actionTypeId: '.test',
  config: { testTextField: 'My text field' },
  secrets: { secretTextField: 'super secret' },
});

describe('EditConnectorFlyout with object-level access control', () => {
  let appMockRenderer: AppMockRenderer;
  let policy: AccessPolicyResponse;
  let access: AccessStateResponse;
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
    validateParams: (): Promise<GenericValidationResult<unknown>> =>
      Promise.resolve({ errors: {} }),
  });

  const getCalls = (path: string) =>
    (appMockRenderer.coreStart.http.get as jest.Mock).mock.calls.filter(
      ([calledPath]) => calledPath === path
    );

  const renderFlyout = (props: Partial<ActionConnector> = {}) =>
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={jest.fn()}
        connector={{ ...connector, ...props } as ActionConnector}
        onConnectorUpdated={jest.fn()}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    policy = POLICY;
    access = ACCESS;
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    appMockRenderer.coreStart.http.get = jest.fn(async (path: string) => {
      if (path === POLICY_PATH) {
        return policy;
      }
      if (path === OBJECT_PATH) {
        return access;
      }
      return ACTION_TYPES;
    }) as unknown as typeof appMockRenderer.coreStart.http.get;
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue({ users: [] });
  });

  it('hides the Access tab while object-level access control is disabled', async () => {
    policy = { ...POLICY, enabled: false };
    renderFlyout();

    expect(await screen.findByTestId('edit-connector-flyout-save-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('accessConnectorTab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connectorReadOnlyAccessCallout')).not.toBeInTheDocument();
    expect(getCalls(OBJECT_PATH)).toHaveLength(0);
  });

  it('hides the Access tab for a preconfigured connector', async () => {
    renderFlyout({ isPreconfigured: true });

    await waitFor(() => expect(getCalls(POLICY_PATH)).toHaveLength(1));
    expect(await screen.findByTestId('edit-connector-flyout-header')).toBeInTheDocument();
    expect(screen.queryByTestId('accessConnectorTab')).not.toBeInTheDocument();
    expect(getCalls(OBJECT_PATH)).toHaveLength(0);
  });

  it('shows the Access tab and the Save button to people who can edit', async () => {
    renderFlyout();

    expect(await screen.findByTestId('accessConnectorTab')).toBeInTheDocument();
    expect(await screen.findByTestId('edit-connector-flyout-save-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('connectorReadOnlyAccessCallout')).not.toBeInTheDocument();
  });

  it('hides Save and shows the read-only callout to people who cannot edit', async () => {
    access = { ...ACCESS, is_owner: false, permissions: ['view', 'use'], acl: undefined };
    renderFlyout();

    expect(await screen.findByTestId('connectorReadOnlyAccessCallout')).toBeInTheDocument();
    expect(screen.getByTestId('accessConnectorTab')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
  });

  it('renders the access panel on the Access tab without the configuration Save button', async () => {
    renderFlyout();
    // The tab appears once the policy loads, and Save once the connector's access loads.
    await screen.findByTestId('accessConnectorTab');
    expect(await screen.findByTestId('edit-connector-flyout-save-btn')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('accessConnectorTab'));

    expect(await screen.findByTestId('accessPanel')).toBeInTheDocument();
    expect(screen.getByTestId('accessPanelGeneralAccess')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nameInput')).not.toBeInTheDocument();
  });
});
