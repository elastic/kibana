/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';
import EditConnectorFlyout from '.';
import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { EditConnectorTabs } from '../../../../types';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';

describe('spec connector edit flyout Test tab', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const actionTypeRegistry = actionTypeRegistryMock.create();

  const mockSpecResponse = (isTestable: boolean) => ({
    metadata: {
      id: 'spec-connector-test',
      display_name: 'Spec Connector Test',
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
    is_testable: isTestable,
  });

  const specConnector = createMockActionConnector({
    id: 'spec-connector-id',
    name: 'Spec Connector Test',
    actionTypeId: 'spec-connector-test',
    config: {},
    secrets: {},
  });

  const outdatedSpecConnector = {
    ...specConnector,
    specVersion: '1.0.0',
    activeSpecVersion: '2.0.0',
  };

  const mockConnectorWireResponse = (specVersion: string, activeSpecVersion: string) => ({
    id: specConnector.id,
    name: specConnector.name,
    connector_type_id: specConnector.actionTypeId,
    is_preconfigured: false,
    is_deprecated: false,
    is_missing_secrets: false,
    is_system_action: false,
    is_connector_type_deprecated: false,
    config: {},
    spec_version: specVersion,
    active_spec_version: activeSpecVersion,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    actionTypeRegistry.has.mockReturnValue(false);
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(mockSpecResponse(true));
    appMockRenderer.coreStart.uiSettings.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'workflows:ui:enabled') {
        return true;
      }
      return undefined;
    });
  });

  it('renders the test form for an opted-in spec connector without throwing', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
      />
    );

    expect(await screen.findByTestId('edit-connector-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
    expect(screen.queryByText('Create an action')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('loads the connector configuration using its pinned spec version', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({
          query: { version: '1.0.0' },
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  it('shows an available update for an outdated spec connector', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('connector-upgrade-callout')).toHaveTextContent(
      'Update available: 2.0.0'
    );
    expect(screen.getByTestId('connector-upgrade-button')).toBeEnabled();
  });

  it('does not offer a downgrade when the active version is lower than the pinned version', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={{
          ...specConnector,
          specVersion: '2.0.0',
          activeSpecVersion: '1.0.0',
        }}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-upgrade-callout')).not.toBeInTheDocument();
  });

  it.each([
    ['invalid pinned version', 'not-semver', '2.0.0'],
    ['invalid active version', '1.0.0', 'not-semver'],
  ])('does not offer an update for an %s', async (_, specVersion, activeSpecVersion) => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={{
          ...specConnector,
          specVersion,
          activeSpecVersion,
        }}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-upgrade-callout')).not.toBeInTheDocument();
  });

  it('disables the update while the form has unsaved changes', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await screen.findByTestId('nameInput');
    await userEvent.type(screen.getByTestId('nameInput'), ' changed');

    await waitFor(() => {
      expect(screen.getByTestId('connector-upgrade-button')).toBeDisabled();
    });
  });

  it('prevents form edits and tests while an update is in progress', async () => {
    let resolveUpgrade: (value: unknown) => void;
    appMockRenderer.coreStart.http.post = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveUpgrade = resolve;
      })
    );

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await userEvent.click(await screen.findByTestId('connector-upgrade-button'));

    await waitFor(() => {
      expect(screen.getByTestId('nameInput')).toHaveAttribute('readonly');
    });
    await userEvent.click(screen.getByTestId('testConnectorTab'));
    expect(await screen.findByTestId('executeActionButton')).toBeDisabled();

    resolveUpgrade!({
      status: 'reconfiguration_required',
      from_version: '1.0.0',
      to_version: '2.0.0',
      connector: mockConnectorWireResponse('2.0.0', '2.0.0'),
    });

    await waitFor(() => {
      expect(screen.getByTestId('executeActionButton')).toBeEnabled();
    });
  });

  it('disables the update while a connector test is in progress', async () => {
    let resolveExecution: (value: unknown) => void;
    appMockRenderer.coreStart.http.post = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveExecution = resolve;
      })
    );

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
      />
    );

    await userEvent.click(await screen.findByTestId('executeActionButton'));
    await userEvent.click(screen.getByTestId('configureConnectorTab'));

    expect(await screen.findByTestId('connector-upgrade-button')).toBeDisabled();

    resolveExecution!({
      connector_id: specConnector.id,
      status: 'ok',
    });

    await waitFor(() => {
      expect(screen.getByTestId('connector-upgrade-button')).toBeEnabled();
    });
  });

  it('upgrades the connector and reloads its newly pinned spec', async () => {
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue({
      status: 'upgraded',
      from_version: '1.0.0',
      to_version: '2.0.0',
      connector: mockConnectorWireResponse('2.0.0', '2.0.0'),
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await userEvent.click(await screen.findByTestId('connector-upgrade-button'));

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
        '/internal/actions/connector/spec-connector-id/_upgrade'
      );
    });
    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({
          query: { version: '2.0.0' },
          signal: expect.any(AbortSignal),
        })
      );
    });
    expect(onConnectorUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        specVersion: '2.0.0',
        activeSpecVersion: '2.0.0',
      })
    );
    expect(await screen.findByTestId('connector-upgrade-success')).toHaveTextContent(
      'Connector updated to 2.0.0'
    );
    expect(screen.queryByTestId('connector-upgrade-callout')).not.toBeInTheDocument();
  });

  it('normalizes a connector reported as current without an error', async () => {
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue({
      status: 'current',
      from_version: '2.0.0',
      to_version: '2.0.0',
      connector: mockConnectorWireResponse('2.0.0', '2.0.0'),
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await userEvent.click(await screen.findByTestId('connector-upgrade-button'));

    await waitFor(() => {
      expect(onConnectorUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          specVersion: '2.0.0',
          activeSpecVersion: '2.0.0',
        })
      );
    });
    expect(screen.queryByTestId('connector-upgrade-callout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connector-upgrade-error')).not.toBeInTheDocument();
  });

  it('preserves the old pin when the update requires reconfiguration', async () => {
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue({
      status: 'reconfiguration_required',
      from_version: '1.0.0',
      to_version: '2.0.0',
      connector: mockConnectorWireResponse('2.0.0', '2.0.0'),
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await userEvent.click(await screen.findByTestId('connector-upgrade-button'));

    expect(
      await screen.findByTestId('connector-upgrade-reconfiguration-required')
    ).toHaveTextContent('Reconfiguration is required');
    expect(screen.getByTestId('connector-upgrade-callout')).toBeInTheDocument();
    expect(onConnectorUpdated).not.toHaveBeenCalled();
    expect(appMockRenderer.coreStart.http.get).not.toHaveBeenCalledWith(
      '/internal/actions/connector_types/spec-connector-test/spec',
      expect.objectContaining({ query: { version: '2.0.0' } })
    );
  });

  it('shows an error and retries a failed update', async () => {
    appMockRenderer.coreStart.http.post = jest
      .fn()
      .mockRejectedValueOnce(new Error('Upgrade failed'))
      .mockResolvedValueOnce({
        status: 'upgraded',
        from_version: '1.0.0',
        to_version: '2.0.0',
        connector: mockConnectorWireResponse('2.0.0', '2.0.0'),
      });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={outdatedSpecConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await userEvent.click(await screen.findByTestId('connector-upgrade-button'));
    expect(await screen.findByTestId('connector-upgrade-error')).toHaveTextContent(
      'Connector update failed'
    );

    await userEvent.click(screen.getByTestId('connector-upgrade-button'));

    expect(await screen.findByTestId('connector-upgrade-success')).toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledTimes(2);
  });

  it('does not show an update when the connector is current', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={{
          ...specConnector,
          specVersion: '2.0.0',
          activeSpecVersion: '2.0.0',
        }}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-upgrade-callout')).not.toBeInTheDocument();
  });

  it('hides the Test tab for a spec connector that has not opted in to testing', async () => {
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(mockSpecResponse(false));

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('configureConnectorTab')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('testConnectorTab')).not.toBeInTheDocument();
    });
  });

  it('seeds the reserved _test subAction and hides action-params inputs for an opted-in spec connector', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
      />
    );

    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('executeActionButton'));

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
        '/api/actions/connector/spec-connector-id/_execute',
        {
          body: JSON.stringify({
            params: {
              subAction: TEST_CONNECTOR_SUB_ACTION,
              subActionParams: {},
            },
          }),
        }
      );
    });
  });

  it('shows loading state on the Test tab while fetching spec', async () => {
    let resolveSpec: (value: ReturnType<typeof mockSpecResponse>) => void;
    const specPromise = new Promise<ReturnType<typeof mockSpecResponse>>((resolve) => {
      resolveSpec = resolve;
    });
    appMockRenderer.coreStart.http.get = jest.fn().mockReturnValue(specPromise);

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('test-connector-form')).not.toBeInTheDocument();

    resolveSpec!(mockSpecResponse(true));

    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
  });

  it('shows error state on the Test tab when spec fetch fails and retries', async () => {
    const errorMessage = 'Failed to fetch spec';
    appMockRenderer.coreStart.http.get = jest
      .fn()
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockSpecResponse(true));

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    expect(await screen.findByTestId('connector-spec-load-error')).toBeInTheDocument();
    expect(screen.queryByTestId('test-connector-form')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('connector-spec-load-retry'));

    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledTimes(2);
  });
});

describe('stack connector edit flyout — embedder path (no connector-types fetch)', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();
  const actionTypeRegistry = actionTypeRegistryMock.create();

  const stackConnector = createMockActionConnector({
    id: 'stack-connector-id',
    name: 'Stack Connector',
    actionTypeId: '.test',
    config: {},
    secrets: {},
    specVersion: '1.0.0',
    activeSpecVersion: '2.0.0',
  });

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
  });

  it('shows the test tab for a stack connector without fetching connector types', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={stackConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('testConnectorTab')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-upgrade-callout')).not.toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.get).not.toHaveBeenCalledWith(
      expect.stringContaining('/internal/actions/connector_types')
    );
  });
});
