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
    expect(appMockRenderer.coreStart.http.get).not.toHaveBeenCalledWith(
      expect.stringContaining('/internal/actions/connector_types')
    );
  });
});
