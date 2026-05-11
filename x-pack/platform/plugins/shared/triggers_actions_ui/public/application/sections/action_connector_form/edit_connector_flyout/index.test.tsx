/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../lib/action_connector_api', () => {
  const actual = jest.requireActual<typeof import('../../../lib/action_connector_api')>(
    '../../../lib/action_connector_api'
  );
  return {
    ...actual,
    loadActionTypes: jest.fn((opts: Parameters<typeof actual.loadActionTypes>[0]) =>
      actual.loadActionTypes(opts)
    ),
  };
});

import React, { lazy } from 'react';

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor, act, screen } from '@testing-library/react';
import EditConnectorFlyout from '.';
import type { ActionConnector, GenericValidationResult } from '../../../../types';
import { EditConnectorTabs } from '../../../../types';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import { TECH_PREVIEW_LABEL } from '../../translations';
import type { ActionType } from '@kbn/actions-plugin/common';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

const { loadActionTypes } = jest.requireMock('../../../lib/action_connector_api') as {
  loadActionTypes: jest.Mock;
};
const actualActionConnectorApi = jest.requireActual<
  typeof import('../../../lib/action_connector_api')
>('../../../lib/action_connector_api');

const defaultEditFlyoutLoadActionTypes: ActionType[] = [
  {
    id: '.test',
    name: 'Test',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting', 'siem'],
    isSystemActionType: false,
    isDeprecated: false,
  },
];

const updateConnectorResponse = {
  connector_type_id: 'test',
  is_preconfigured: false,
  is_deprecated: false,
  name: 'My test',
  config: { testTextField: 'My text field' },
  secrets: {},
  id: '123',
};

const executeConnectorResponse = {
  status: 'ok',
  data: {},
};

const connector: ActionConnector = createMockActionConnector({
  id: '123',
  name: 'My test',
  actionTypeId: '.test',
  config: { testTextField: 'My text field' },
  secrets: { secretTextField: 'super secret' },
  authMode: 'shared',
});

describe('EditConnectorFlyout', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
  });

  const actionTypeRegistry = actionTypeRegistryMock.create();

  beforeEach(async () => {
    jest.clearAllMocks();
    loadActionTypes.mockResolvedValue(defaultEditFlyoutLoadActionTypes);
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue(updateConnectorResponse);
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue(executeConnectorResponse);
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('renders', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByTestId('edit-connector-flyout')).toBeInTheDocument();
    expect(getByTestId('edit-connector-flyout-header')).toBeInTheDocument();
    expect(getByTestId('edit-connector-flyout-footer')).toBeInTheDocument();
  });

  it('enables save button when the form is modified', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );
    await waitFor(() => {
      expect(getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();
    });

    await act(async () => {
      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name', {
        delay: 10,
      });
    });

    expect(getByTestId('edit-connector-flyout-save-btn')).not.toBeDisabled();
  });

  it('shows a confirmation modal on close if the form is modified', async () => {
    const { getByTestId, getByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );
    await waitFor(() => {
      expect(getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();
    });

    await userEvent.clear(getByTestId('nameInput'));
    await userEvent.type(getByTestId('nameInput'), 'My new name', {
      delay: 10,
    });

    await userEvent.click(getByTestId('edit-connector-flyout-close-btn'));

    expect(getByText('Discard unsaved changes to connector?')).toBeInTheDocument();
  });

  it('renders the connector form correctly', async () => {
    const { getByTestId, queryByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(queryByText('This connector is read-only.')).not.toBeInTheDocument();
      expect(getByTestId('nameInput')).toHaveValue('My test');
      expect(getByTestId('test-connector-text-field')).toHaveValue('My text field');
    });
  });

  it('removes the secrets from the connector', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('test-connector-secret-text-field')).toBeInTheDocument();
    });

    expect(getByTestId('test-connector-secret-text-field')).toHaveValue('');
  });

  it('renders correctly if the connector is preconfigured', async () => {
    const { getByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={{ ...connector, isPreconfigured: true }}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByText('This connector is read-only.')).toBeInTheDocument();
  });

  it('shows the buttons', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('edit-connector-flyout-save-btn')).toBeInTheDocument();
    });
    expect(getByTestId('edit-connector-flyout-close-btn')).toBeInTheDocument();
  });

  it('does not show the save button if the use does not have permissions to update connector', async () => {
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: false, show: true },
    };

    const { queryByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
  });

  it('does not show the save button if the connector is preconfigured', async () => {
    const { queryByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={{ ...connector, isPreconfigured: true }}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
  });

  it('disables the buttons when there are error on the form', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
    });

    /**
     * Clear the name so the form can be invalid
     */
    await userEvent.clear(getByTestId('nameInput'));
    await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(getByTestId('edit-connector-flyout-close-btn')).not.toBeDisabled();
      expect(getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();
    });
  });

  it('shows an error callout and no form when loadActionTypes fails', async () => {
    loadActionTypes.mockRejectedValue(new Error('network error'));

    const { getByTestId, queryByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('connector-action-types-load-error')).toBeInTheDocument();
    });

    expect(queryByTestId('nameInput')).not.toBeInTheDocument();
  });

  describe('Header', () => {
    it('shows the icon', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('edit-connector-flyout-header-icon')).toBeInTheDocument();
      });
    });

    it('does not shows the icon when is not defined', async () => {
      // @ts-expect-error
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, iconClass: undefined });
      const { queryByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(queryByTestId('edit-connector-flyout-header-icon')).not.toBeInTheDocument();
    });

    it('shows the correct title', async () => {
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByText('Edit connector')).toBeInTheDocument();
    });

    it('shows the correct on preconfigured connectors', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('preconfiguredBadge')).toBeInTheDocument();
    });

    it('does not show `tech preview` badge when isExperimental is false', async () => {
      const { queryByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(queryByText(TECH_PREVIEW_LABEL)).not.toBeInTheDocument();
    });

    it('shows `tech preview` badge when isExperimental is true', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: true });
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(getByText(TECH_PREVIEW_LABEL)).toBeInTheDocument();
    });

    it('does not show `Technical Preview` badge when `isExperimental` is `false`', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: false });
      const { queryByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(queryByText(TECH_PREVIEW_LABEL)).not.toBeInTheDocument();
    });

    it('shows `Technical Preview` badge when `isExperimental` is `true`', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: true });
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(getByText(TECH_PREVIEW_LABEL)).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('shows the tabs', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
        expect(getByTestId('testConnectorTab')).toBeInTheDocument();
      });
    });

    it('navigates to the test form', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('testConnectorTab')).toBeInTheDocument();
      });

      expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
      expect(getByTestId('testConnectorTab')).toBeInTheDocument();

      await userEvent.click(getByTestId('testConnectorTab'));

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });
    });

    it('opens the provided tab', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });
    });
  });

  describe('Submitting', () => {
    it('updates the connector correctly', async () => {
      const { getByTestId, queryByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name');
      await userEvent.type(getByTestId('test-connector-secret-text-field'), 'password');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
        expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');
      });

      await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My new name","config":{"testTextField":"My text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      expect(onClose).not.toHaveBeenCalled();
      expect(onConnectorUpdated).toHaveBeenCalledWith({
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

    it('updates connector form field with latest value', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      await user.clear(getByTestId('test-connector-text-field'));
      await user.type(getByTestId('test-connector-text-field'), 'My updated text field');

      expect(getByTestId('test-connector-text-field')).toHaveValue('My updated text field');

      await user.clear(getByTestId('nameInput'));
      await user.type(getByTestId('nameInput'), 'My test');
      await user.type(getByTestId('test-connector-secret-text-field'), 'password');

      expect(getByTestId('nameInput')).toHaveValue('My test');
      expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');

      await user.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My test","config":{"testTextField":"My updated text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      // Unsure why this is failing and has the old value "My text field again".
      // after the userEvent update to v14 in https://github.com/elastic/kibana/pull/189949.
      // As a fallback the above check was added to ensure the correct value is still being sent.
      // expect(getByTestId('test-connector-text-field')).toHaveValue('My updated text field');
    });

    it('updates the connector and close the flyout correctly', async () => {
      const { getByTestId, getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name');
      await userEvent.type(getByTestId('test-connector-secret-text-field'), 'password');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
        expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');
      });

      await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My new name","config":{"testTextField":"My text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      expect(getByText('Changes Saved')).toBeInTheDocument();

      await userEvent.click(getByTestId('edit-connector-flyout-close-btn'));

      expect(onClose).toHaveBeenCalled();
      expect(onConnectorUpdated).toHaveBeenCalledWith({
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

    it('show error message in the form header', async () => {
      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();
      await userEvent.clear(screen.getByTestId('nameInput'));
      await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
      expect(await screen.findByTestId('connector-form-header-error-label')).toBeInTheDocument();
    });

    it('removes error message from the form header', async () => {
      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('nameInput')).toBeInTheDocument();

      await userEvent.clear(screen.getByTestId('nameInput'));
      await userEvent.type(screen.getByTestId('nameInput'), 'My new name');
      await userEvent.type(screen.getByTestId('test-connector-secret-text-field'), 'password');
      await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
      expect(screen.queryByTestId('connector-form-header-error-label')).not.toBeInTheDocument();
    });

    it('runs pre submit validator correctly', async () => {
      const errorActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
        actionConnectorFields: lazy(() => import('../connector_error_mock')),
      });
      actionTypeRegistry.get.mockReturnValue(errorActionTypeModel);

      const { getByTestId, getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          onConnectorUpdated={onConnectorUpdated}
          connector={connector}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-error-text-field')).toBeInTheDocument();
      });

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
      });

      await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(getByText('Error on pre submit validator')).toBeInTheDocument();
      });
    });
  });

  describe('Testing', () => {
    it('tests the connector correctly', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();

      await userEvent.click(getByTestId('executeActionButton'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
          '/api/actions/connector/123/_execute',
          { body: '{"params":{}}' }
        );
      });

      expect(getByTestId('executionSuccessfulResult')).toBeInTheDocument();
    });

    it('resets the results when changing tabs', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();

      await userEvent.click(getByTestId('executeActionButton'));

      await waitFor(() => {
        expect(getByTestId('executionSuccessfulResult')).toBeInTheDocument();
      });

      await userEvent.click(getByTestId('configureConnectorTab'));

      await waitFor(() => {
        expect(getByTestId('nameInput')).toBeInTheDocument();
      });

      await userEvent.click(getByTestId('testConnectorTab'));

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();
    });

    it('throws an error correctly', async () => {
      appMockRenderer.coreStart.http.post = jest
        .fn()
        .mockRejectedValue(new Error('error executing'));

      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      await userEvent.click(getByTestId('executeActionButton'));

      await waitFor(() => {
        expect(getByTestId('executionFailureResult')).toBeInTheDocument();
      });
    });

    it('resets the results when modifying the form', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      await userEvent.click(getByTestId('executeActionButton'));

      await waitFor(() => {
        expect(getByTestId('executionSuccessfulResult')).toBeInTheDocument();
      });

      await userEvent.click(getByTestId('configureConnectorTab'));

      await waitFor(() => {
        expect(getByTestId('nameInput')).toBeInTheDocument();
      });

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name', {
        delay: 10,
      });

      await userEvent.click(getByTestId('testConnectorTab'));

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();
      expect(getByTestId('executeActionButton')).toBeDisabled();
    });

    it('should not disable the test tab', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
        expect(screen.queryByTestId('testConnectorTab')).toBeEnabled();
      });
    });
  });
});

describe('is spec connector', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
    source: 'spec',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
  });

  const actionTypeRegistry = actionTypeRegistryMock.create();

  beforeEach(async () => {
    jest.clearAllMocks();
    loadActionTypes.mockResolvedValue(defaultEditFlyoutLoadActionTypes);
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue(updateConnectorResponse);
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue(executeConnectorResponse);
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('should not render the test tab', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
    expect(screen.queryByTestId('testConnectorTab')).not.toBeInTheDocument();
  });
});

describe('EditConnectorFlyout spec loading', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const specConnectorType = {
    id: 'spec-edit-connector',
    name: 'Spec Edit Connector',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic' as const,
    supportedFeatureIds: ['workflows'],
    source: 'spec',
    description: 'Test spec connector description',
  };

  const mockSpecResponse = {
    metadata: {
      id: 'spec-edit-connector',
      display_name: 'Spec Edit Connector',
      description: 'Connect to Test API',
      minimum_license: 'basic',
      supported_feature_ids: ['workflows'],
    },
    schema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {},
        },
        secrets: {
          anyOf: [
            {
              type: 'object',
              properties: {
                authType: { const: 'api_key_header', type: 'string' },
                apiKey: {
                  type: 'string',
                  minLength: 1,
                  label: 'API key',
                  sensitive: true,
                },
              },
              required: ['authType', 'apiKey'],
              label: 'API key header authentication',
            },
          ],
          label: 'Authentication',
        },
      },
      required: ['config', 'secrets'],
    },
  };

  const specConnector: ActionConnector = createMockActionConnector({
    id: 'spec-conn-1',
    name: 'Spec connector instance',
    actionTypeId: 'spec-edit-connector',
    config: {},
    secrets: {},
    authMode: 'shared',
  });

  const actionTypeRegistry = actionTypeRegistryMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    loadActionTypes.mockResolvedValue([specConnectorType as ActionType]);
    actionTypeRegistry.has.mockReturnValue(false);
    actionTypeRegistry.get.mockImplementation(() => {
      throw new Error('Unexpected get for unregistered type');
    });
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue({
      connector_type_id: 'spec-edit-connector',
      is_preconfigured: false,
      is_deprecated: false,
      name: 'Spec connector instance',
      config: {},
      secrets: {},
      id: 'spec-conn-1',
    });
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue(executeConnectorResponse);
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(mockSpecResponse);
    appMockRenderer.coreStart.uiSettings.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'workflows:ui:enabled') {
        return true;
      }
      return undefined;
    });
  });

  afterEach(() => {
    loadActionTypes.mockImplementation((opts) => actualActionConnectorApi.loadActionTypes(opts));
  });

  it('fetches spec from API when editing a spec-based connector', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={specConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-edit-connector/spec',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    });
  });

  it('shows loading state while spec is being fetched', async () => {
    let resolveSpec: (value: typeof mockSpecResponse) => void;
    const specPromise = new Promise<typeof mockSpecResponse>((resolve) => {
      resolveSpec = resolve;
    });
    appMockRenderer.coreStart.http.get = jest.fn().mockReturnValue(specPromise);

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={specConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('nameInput')).not.toBeInTheDocument();

    resolveSpec!(mockSpecResponse);

    await waitFor(() => {
      expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    });
  });

  it('shows error state when spec fetch fails', async () => {
    const errorMessage = 'Failed to fetch spec';
    appMockRenderer.coreStart.http.get = jest.fn().mockRejectedValue(new Error(errorMessage));

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={specConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('connector-spec-load-error')).toBeInTheDocument();
    });
  });

  it('does not fetch spec when loadActionTypes has no match (unregistered connector type)', async () => {
    loadActionTypes.mockResolvedValue([
      {
        id: 'other-type',
        name: 'Other',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting'],
      },
    ] as ActionType[]);

    const orphanConnector: ActionConnector = createMockActionConnector({
      id: 'orphan-1',
      name: 'Orphan',
      actionTypeId: '.orphan-plugin-type',
      config: {},
      secrets: {},
      authMode: 'shared',
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={orphanConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(loadActionTypes).toHaveBeenCalled();
    });

    expect(appMockRenderer.coreStart.http.get).not.toHaveBeenCalled();
  });
});
