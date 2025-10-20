/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';
import CreateConnectorFlyout from '.';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import { TECH_PREVIEW_LABEL } from '../../translations';

jest.mock('../../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../../lib/action_connector_api') as any),
  loadActionTypes: jest.fn(),
}));

const { loadActionTypes } = jest.requireMock('../../../lib/action_connector_api');

const createConnectorResponse = {
  connector_type_id: 'test',
  is_preconfigured: false,
  is_deprecated: false,
  name: 'My test',
  config: { testTextField: 'My text field' },
  secrets: {},
  id: '123',
};

const history = createMemoryHistory({
  initialEntries: ['/'],
});

describe('CreateConnectorFlyout', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorCreated = jest.fn();
  const onTestConnector = jest.fn();

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
  });

  loadActionTypes.mockResolvedValue([
    {
      id: actionTypeModel.id,
      enabled: true,
      name: 'Test',
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic' as const,
      supportedFeatureIds: ['alerting', 'siem'],
    },
  ]);

  const actionTypeRegistry = actionTypeRegistryMock.create();

  const renderFlyout = () =>
    appMockRenderer.render(
      <Router history={history}>
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      </Router>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue(createConnectorResponse);
  });

  it('renders', async () => {
    const { getByTestId, findByTestId } = renderFlyout();

    expect(await findByTestId('create-connector-flyout')).toBeInTheDocument();
    expect(getByTestId('create-connector-flyout-header')).toBeInTheDocument();
    expect(getByTestId('create-connector-flyout-footer')).toBeInTheDocument();
  });

  it('renders action type menu on flyout open', async () => {
    const { getByTestId } = renderFlyout();

    expect(await getByTestId(`${actionTypeModel.id}-card`)).toBeInTheDocument();
  });

  it('shows the correct buttons without an action type selected', async () => {
    const { findByTestId, queryByTestId } = renderFlyout();

    expect(await findByTestId('create-connector-flyout-close-btn')).toBeInTheDocument();
    expect(queryByTestId('create-connector-flyout-save-test-btn')).toBe(null);
    expect(queryByTestId('create-connector-flyout-save-btn')).toBe(null);
  });

  it('shows the correct buttons when selecting an action type', async () => {
    const { getByTestId } = renderFlyout();
    await userEvent.click(getByTestId(`${actionTypeModel.id}-card`));

    await waitFor(() => {
      expect(getByTestId('create-connector-flyout-back-btn')).toBeInTheDocument();
      expect(getByTestId('create-connector-flyout-save-test-btn')).toBeInTheDocument();
      expect(getByTestId('create-connector-flyout-save-btn')).toBeInTheDocument();
    });
  });

  it('does not show the save and test button if the onTestConnector is not provided', async () => {
    const { queryByTestId } = renderFlyout();

    expect(queryByTestId('create-connector-flyout-save-test-btn')).not.toBeInTheDocument();
  });

  it('disables the buttons when the user does not have permissions to create a connector', async () => {
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: false, show: true },
    };

    const { findByTestId } = renderFlyout();

    expect(await findByTestId('create-connector-flyout-close-btn')).not.toBeDisabled();
  });

  it('disables the buttons when there are error on the form', async () => {
    const { getByTestId, findByTestId } = renderFlyout();

    await userEvent.click(await findByTestId(`${actionTypeModel.id}-card`));

    await waitFor(() => {
      expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
    });

    await userEvent.click(await findByTestId('create-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(getByTestId('create-connector-flyout-back-btn')).not.toBeDisabled();
      expect(getByTestId('create-connector-flyout-save-test-btn')).toBeDisabled();
      expect(getByTestId('create-connector-flyout-save-btn')).toBeDisabled();
    });
  });

  it('shows the correct buttons when selecting an action type with subtype', async () => {
    actionTypeRegistry.get.mockReturnValue({
      ...actionTypeModel,
      subtype: [
        { id: 'my-action-type', name: 'My Action Type' },
        { id: 'my-action-type-1', name: 'My Action Type 1' },
      ],
    });

    loadActionTypes.mockResolvedValueOnce([
      {
        id: actionTypeModel.id,
        enabled: true,
        name: 'Test',
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'siem'],
      },
      {
        id: 'my-action-type',
        name: 'Test 1',
        enabled: false,
        enabledInConfig: false,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'siem'],
      },
      {
        id: 'my-action-type-1',
        name: 'My Action Type 1',
        enabled: true,
        enabledInConfig: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'siem'],
        enabledInLicense: true,
      },
    ]);

    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
        onTestConnector={onTestConnector}
      />
    );

    await userEvent.click(await screen.findByTestId(`${actionTypeModel.id}-card`));

    await waitFor(() => {
      expect(screen.getByText('Test connector')).toBeInTheDocument();
      expect(screen.queryByText('Test 1 connector')).not.toBeInTheDocument();
      expect(screen.queryByText('My Action Type 1 connector')).not.toBeInTheDocument();

      expect(screen.queryByTestId('my-action-type-1Button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('my-action-typeButton')).not.toBeInTheDocument();
    });
  });

  describe('Licensing', () => {
    it('renders banner with subscription links when gold features are disabled due to licensing', async () => {
      const disabledActionType = actionTypeRegistryMock.createMockActionTypeModel();
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionTypeModel.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic' as const,
          supportedFeatureIds: ['alerting', 'siem'],
        },
        {
          id: disabledActionType.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);
      const { getByTestId } = renderFlyout();
      expect(getByTestId('upgrade-your-license-callout')).toBeInTheDocument();
    });
    it('does not render banner with subscription links when only platinum features are disabled due to licensing', async () => {
      const disabledActionType = actionTypeRegistryMock.createMockActionTypeModel();
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionTypeModel.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic' as const,
          supportedFeatureIds: ['alerting', 'siem'],
        },
        {
          id: disabledActionType.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          supportedFeatureIds: ['alerting'],
          minimumLicenseRequired: 'platinum',
        },
      ]);
      const { queryByTestId } = renderFlyout();
      expect(queryByTestId('upgrade-your-license-callout')).toBeFalsy();
    });
    it('does not render banner with subscription links when only enterprise features are disabled due to licensing', async () => {
      const disabledActionType = actionTypeRegistryMock.createMockActionTypeModel();
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionTypeModel.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic' as const,
          supportedFeatureIds: ['alerting', 'siem'],
        },
        {
          id: disabledActionType.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'enterprise',
          supportedFeatureIds: ['alerting'],
        },
      ]);
      const { queryByTestId } = renderFlyout();
      expect(queryByTestId('upgrade-your-license-callout')).toBeFalsy();
    });
  });

  describe('Header', () => {
    it('does not shows the icon when selection connector type', async () => {
      const { queryByTestId } = renderFlyout();
      expect(queryByTestId('create-connector-flyout-header-icon')).not.toBeInTheDocument();
    });
    it('shows the correct title when selecting connector type', async () => {
      const { getByText } = renderFlyout();
      expect(getByText('Select a connector')).toBeInTheDocument();
    });
    it('shows the compatibility badges when the connector type is selected', async () => {
      const { getByTestId, getByText } = renderFlyout();
      await userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      await waitFor(() => {
        expect(screen.getByTestId('test-connector-text-field')).toBeInTheDocument();
      });
      expect(getByTestId('create-connector-flyout-header-compatibility')).toBeInTheDocument();
      expect(getByText('Alerting Rules')).toBeInTheDocument();
    });
    it('shows the icon when the connector type is selected', async () => {
      const { getByTestId, getByText, queryByText } = renderFlyout();
      await userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      await waitFor(() => {
        expect(screen.getByTestId('test-connector-text-field')).toBeInTheDocument();
      });
      expect(queryByText('Select a connector')).not.toBeInTheDocument();
      expect(getByTestId('create-connector-flyout-header-icon')).toBeInTheDocument();
      expect(getByText('Test connector')).toBeInTheDocument();
      expect(getByText(`selectMessage-${actionTypeModel.id}`)).toBeInTheDocument();
    });
    it('does not show beta badge when isExperimental is undefined', async () => {
      const { queryByText } = renderFlyout();
      expect(queryByText(TECH_PREVIEW_LABEL)).not.toBeInTheDocument();
    });
    it('does not show beta badge when isExperimental is false', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: false });
      const { queryByText } = renderFlyout();
      expect(queryByText(TECH_PREVIEW_LABEL)).not.toBeInTheDocument();
    });
    it('shows beta badge when isExperimental is true', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: true });
      const { getByText } = renderFlyout();
      expect(getByText(TECH_PREVIEW_LABEL)).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('displays search field', async () => {
      const { findByTestId } = renderFlyout();

      expect(await findByTestId('createConnectorsModalSearch')).toBeInTheDocument();
    });

    it('does not show the search field after an action type is selected', async () => {
      const { findByTestId, queryByTestId } = renderFlyout();
      expect(await findByTestId('createConnectorsModalSearch')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId(`${actionTypeModel.id}-card`));
      expect(await queryByTestId('createConnectorsModalSearch')).not.toBeInTheDocument();
    });
  });

  describe('Submitting', () => {
    it('creates a connector correctly', async () => {
      const { getByTestId, queryByTestId } = renderFlyout();

      await userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      await waitFor(() => {
        expect(screen.getByTestId('test-connector-text-field')).toBeInTheDocument();
      });
      await userEvent.type(getByTestId('nameInput'), 'My test', {
        delay: 100,
      });
      await userEvent.type(getByTestId('test-connector-text-field'), 'My text field', {
        delay: 100,
      });
      await userEvent.click(getByTestId('create-connector-flyout-save-btn'));
      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith('/api/actions/connector', {
          body: `{"name":"My test","config":{"testTextField":"My text field"},"secrets":{},"connector_type_id":"${actionTypeModel.id}"}`,
        });
      });
      expect(onClose).toHaveBeenCalled();
      expect(onTestConnector).not.toHaveBeenCalled();
      expect(onConnectorCreated).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
      expect(queryByTestId('connector-form-header-error-label')).not.toBeInTheDocument();
    });
    it('show error message in the form header', async () => {
      const { findByTestId } = renderFlyout();
      await userEvent.click(await screen.findByTestId(`${actionTypeModel.id}-card`));
      expect(await findByTestId('test-connector-text-field')).toBeInTheDocument();
      await userEvent.type(await findByTestId('test-connector-text-field'), 'My text field', {
        delay: 100,
      });
      await userEvent.click(await findByTestId('create-connector-flyout-save-btn'));
      expect(onClose).not.toHaveBeenCalled();
      expect(onConnectorCreated).not.toHaveBeenCalled();
      expect(await findByTestId('connector-form-header-error-label')).toBeInTheDocument();
    });
    it('removes error message from the form header', async () => {
      const { findByTestId } = renderFlyout();
      await userEvent.click(await screen.findByTestId(`${actionTypeModel.id}-card`));
      expect(await findByTestId('test-connector-text-field')).toBeInTheDocument();
      await userEvent.type(await findByTestId('test-connector-text-field'), 'My text field', {
        delay: 100,
      });
      await userEvent.click(await screen.findByTestId('create-connector-flyout-save-btn'));
      expect(onClose).not.toHaveBeenCalled();
      expect(onConnectorCreated).not.toHaveBeenCalled();
      expect(await findByTestId('connector-form-header-error-label')).toBeInTheDocument();
      await userEvent.type(await findByTestId('nameInput'), 'My test', {
        delay: 100,
      });
      await userEvent.click(await findByTestId('create-connector-flyout-save-btn'));
      expect(onClose).toHaveBeenCalled();
      expect(onConnectorCreated).toHaveBeenCalled();
      expect(screen.queryByTestId('connector-form-header-error-label')).not.toBeInTheDocument();
    });
    it('runs pre submit validator correctly', async () => {
      const errorActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
        actionConnectorFields: lazy(() => import('../connector_error_mock')),
      });
      actionTypeRegistry.get.mockReturnValue(errorActionTypeModel);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: errorActionTypeModel.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic' as const,
        },
      ]);
      const { getByTestId, getByText } = renderFlyout();

      await userEvent.click(getByTestId(`${errorActionTypeModel.id}-card`));
      await waitFor(() => {
        expect(getByTestId('test-connector-error-text-field')).toBeInTheDocument();
      });
      await userEvent.type(getByTestId('nameInput'), 'My test', {
        delay: 100,
      });
      await userEvent.type(getByTestId('test-connector-error-text-field'), 'My text field', {
        delay: 100,
      });
      await userEvent.click(getByTestId('create-connector-flyout-save-btn'));
      await waitFor(() => {
        expect(getByText('Error on pre submit validator')).toBeInTheDocument();
      });
    });
  });

  describe('Testing', () => {
    it('saves and test correctly', async () => {
      const { getByTestId, findByTestId } = renderFlyout();

      await userEvent.click(await findByTestId(`${actionTypeModel.id}-card`));

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      await userEvent.click(getByTestId('nameInput'));
      await userEvent.paste('My test');
      await userEvent.click(getByTestId('test-connector-text-field'));
      await userEvent.paste('My text field');

      await userEvent.click(getByTestId('create-connector-flyout-save-test-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith('/api/actions/connector', {
          body: `{"name":"My test","config":{"testTextField":"My text field"},"secrets":{},"connector_type_id":"${actionTypeModel.id}"}`,
        });
      });

      expect(onClose).toHaveBeenCalled();
      expect(onTestConnector).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
      expect(onConnectorCreated).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
    });
  });

  describe('Footer', () => {
    it('shows the action types when pressing the back button', async () => {
      const { getByTestId, findByTestId } = renderFlyout();

      await userEvent.click(await findByTestId(`${actionTypeModel.id}-card`));

      await waitFor(() => {
        expect(getByTestId('create-connector-flyout-back-btn')).toBeInTheDocument();
        expect(getByTestId('nameInput')).toBeInTheDocument();
      });

      await userEvent.click(getByTestId('create-connector-flyout-back-btn'));

      expect(getByTestId(`${actionTypeModel.id}-card`)).toBeInTheDocument();
    });

    it('closes the flyout when pressing close', async () => {
      const { findByTestId } = renderFlyout();

      await userEvent.click(await findByTestId('create-connector-flyout-close-btn'));

      expect(onClose).toHaveBeenCalled();
    });
  });
});
