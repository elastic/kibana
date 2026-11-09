/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import EditConnectorFlyout from '.';
import type { ActionConnector, GenericValidationResult } from '../../../../types';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import {
  clearConnectorFlyoutTabs,
  registerConnectorFlyoutTab,
  type ConnectorFlyoutTabChanges,
} from '../../../lib/connector_flyout_tabs';

jest.setTimeout(15_000);

const connector: ActionConnector = createMockActionConnector({
  id: '123',
  name: 'My test',
  actionTypeId: '.test',
  config: { testTextField: 'My text field' },
  secrets: { secretTextField: 'super secret' },
  authMode: 'shared',
});

const connectorType = (supportedFeatureIds: string[]) => ({
  id: '.test',
  name: 'Test',
  enabled: true,
  enabled_in_config: true,
  enabled_in_license: true,
  supported_feature_ids: supportedFeatureIds,
  minimum_license_required: 'basic',
  is_system_action_type: false,
  is_deprecated: false,
});

describe('EditConnectorFlyout tabs added by other plugins', () => {
  let appMockRenderer: AppMockRenderer;
  const actionTypeRegistry = actionTypeRegistryMock.create();

  const renderFlyout = (supportedFeatureIds: string[], onClose = jest.fn()) => {
    appMockRenderer.coreStart.http.get = jest
      .fn()
      .mockResolvedValue([connectorType(supportedFeatureIds)]);
    return appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={jest.fn()}
      />
    );
  };

  beforeEach(() => {
    clearConnectorFlyoutTabs();
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(
      actionTypeRegistryMock.createMockActionTypeModel({
        actionConnectorFields: lazy(() => import('../connector_mock')),
        validateParams: (): Promise<GenericValidationResult<unknown>> =>
          Promise.resolve({ errors: {} }),
      })
    );
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
  });

  afterEach(() => clearConnectorFlyoutTabs());

  const registerContextTab = () =>
    registerConnectorFlyoutTab({
      id: 'context',
      title: 'Context',
      isSupported: ({ supportedFeatureIds }) => supportedFeatureIds.includes('contextEngine'),
      render: ({ connector: shown, isReadOnly }) => (
        <div data-test-subj="contextTabContent">
          {shown.name} {isReadOnly ? 'read-only' : 'editable'}
        </div>
      ),
    });

  it('shows a registered tab for a connector whose type supports it, and renders it with the connector', async () => {
    registerContextTab();
    renderFlyout(['contextEngine']);

    userEvent.click(await screen.findByTestId('connectorFlyoutTab-context'));

    expect(await screen.findByTestId('contextTabContent')).toHaveTextContent('My test editable');
    // The built-in tabs are still there.
    expect(screen.getByTestId('configureConnectorTab')).toBeInTheDocument();
  });

  it('does not show it for a connector whose type does not support it', async () => {
    registerContextTab();
    const { getByTestId } = renderFlyout(['alerting']);

    await waitFor(() => expect(appMockRenderer.coreStart.http.get).toHaveBeenCalled());
    expect(getByTestId('edit-connector-flyout-header')).toBeInTheDocument();
    expect(screen.queryByTestId('connectorFlyoutTab-context')).not.toBeInTheDocument();
  });

  it('asks for nothing, and shows nothing extra, when no plugin has registered a tab', async () => {
    renderFlyout(['contextEngine']);

    await screen.findByTestId('edit-connector-flyout-header');
    const paths = (appMockRenderer.coreStart.http.get as jest.Mock).mock.calls.map(
      ([path]) => path
    );
    expect(paths.some((path: string) => path.includes('connector_types'))).toBe(false);
    expect(screen.queryByTestId('connectorFlyoutTab-context')).not.toBeInTheDocument();
  });

  describe('a tab with changes of its own', () => {
    const registerEditableTab = (save: ConnectorFlyoutTabChanges['save'], isValid = true) =>
      registerConnectorFlyoutTab({
        id: 'context',
        title: 'Context',
        isSupported: ({ supportedFeatureIds }) => supportedFeatureIds.includes('contextEngine'),
        render: ({ onChanges }) => (
          <input
            data-test-subj="contextInput"
            onChange={(event) => onChanges({ isDirty: event.target.value !== '', isValid, save })}
          />
        ),
      });

    const edit = async () => {
      userEvent.click(await screen.findByTestId('connectorFlyoutTab-context'));
      fireEvent.change(await screen.findByTestId('contextInput'), { target: { value: 'x' } });
    };

    it('saves with the flyout’s Save, without saving a connector that did not change', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      registerEditableTab(save);
      renderFlyout(['contextEngine']);

      expect(await screen.findByTestId('edit-connector-flyout-save-btn')).toBeDisabled();
      await edit();
      await waitFor(() =>
        expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeEnabled()
      );
      userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
      expect(appMockRenderer.coreStart.http.put).not.toHaveBeenCalled();
    });

    it('keeps Save off while the tab’s changes are not valid', async () => {
      registerEditableTab(jest.fn(), false);
      renderFlyout(['contextEngine']);

      await edit();

      expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();
    });

    it('asks before closing with changes the tab has not saved', async () => {
      registerEditableTab(jest.fn());
      const onClose = jest.fn();
      renderFlyout(['contextEngine'], onClose);

      await edit();
      userEvent.click(screen.getByTestId('edit-connector-flyout-close-btn'));

      expect(await screen.findByText('Discard unsaved changes to connector?')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('keeps what was typed in the tab when another tab is looked at', async () => {
      registerEditableTab(jest.fn());
      renderFlyout(['contextEngine']);

      await edit();
      userEvent.click(screen.getByTestId('configureConnectorTab'));
      userEvent.click(screen.getByTestId('connectorFlyoutTab-context'));

      expect(screen.getByTestId('contextInput')).toHaveValue('x');
    });
  });
});
