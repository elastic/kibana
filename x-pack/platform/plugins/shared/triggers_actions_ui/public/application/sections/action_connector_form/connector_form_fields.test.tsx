/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { FormTestProvider } from '../../components/test_utils';
import { ConnectorFormFields } from './connector_form_fields';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../test_utils';
import { createAppMockRenderer } from '../test_utils';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeIsDual: jest.fn((id: string) => id === '.dual'),
    connectorTypeIsInboundOnly: jest.fn((id: string) => id === '.inboundWebhook'),
  };
});

describe('ConnectorFormFields', () => {
  let appMockRenderer: AppMockRenderer;
  const onSubmit = jest.fn();
  const defaultValue = {
    id: 'test-id',
    actionTypeId: '.test',
    isDeprecated: 'false',
    name: 'My test connector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    coreMock.createSetup();
    appMockRenderer = createAppMockRenderer();
  });

  it('does not show the fields component if it is null', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: null,
    });

    const result = appMockRenderer.render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFields
          actionTypeModel={actionTypeModel}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    expect(result.queryByTestId('connector-settings-label')).toBeFalsy();
  });

  it('shows the connector fields', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
    });

    const result = appMockRenderer.render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFields
          actionTypeModel={actionTypeModel}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    expect(result.getByTestId('connector-settings-label')).toBeInTheDocument();
    await waitFor(() => {
      expect(result.getByTestId('test-connector-text-field')).toBeInTheDocument();
    });
  });

  it('renders settingsContent under Connector settings', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: null,
    });

    const result = appMockRenderer.render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFields
          actionTypeModel={actionTypeModel}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
          settingsContent={<div data-test-subj="custom-settings-content">Webhook URL</div>}
        />
      </FormTestProvider>
    );

    expect(result.getByTestId('connector-settings-label')).toBeInTheDocument();
    expect(result.getByTestId('custom-settings-content')).toBeInTheDocument();
  });

  it('shows the settings heading when hideSettingsTitle is set if settingsContent is present', () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
      connectorForm: { hideSettingsTitle: true },
    });

    const result = appMockRenderer.render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFields
          actionTypeModel={actionTypeModel}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
          settingsContent={<div data-test-subj="custom-settings-content">Webhook URL</div>}
        />
      </FormTestProvider>
    );

    expect(result.getByTestId('connector-settings-label')).toBeInTheDocument();
    expect(result.getByTestId('custom-settings-content')).toBeInTheDocument();
  });

  it('does not show the receive-events switch for inbound-only connectors', () => {
    const inboundActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.inboundWebhook',
      actionConnectorFields: null,
      connectorForm: { hideSettingsTitle: true },
    });

    const result = appMockRenderer.render(
      <FormTestProvider
        onSubmit={onSubmit}
        defaultValue={{ ...defaultValue, actionTypeId: '.inboundWebhook' }}
      >
        <ConnectorFormFields
          actionTypeModel={inboundActionTypeModel}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
          settingsContent={<div data-test-subj="custom-settings-content">Webhook URL</div>}
        />
      </FormTestProvider>
    );

    expect(result.queryByTestId('inbound-events-enabled-switch')).not.toBeInTheDocument();
    expect(result.queryByTestId('connector-outbound-label')).not.toBeInTheDocument();
    expect(result.getByTestId('custom-settings-content')).toBeInTheDocument();
  });

  describe('dual connectors', () => {
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('./connector_mock')),
    });

    const dualDefaultValue = {
      id: 'test-id',
      actionTypeId: '.dual',
      isDeprecated: 'false',
      name: 'My dual connector',
      isInboundEventsEnabled: false,
    };

    beforeEach(() => {
      appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
      appMockRenderer.coreStart.application.capabilities = {
        ...appMockRenderer.coreStart.application.capabilities,
        actions: { save: true, show: true, execute: true },
      };
    });

    it('shows inbound then outbound with the receive-events switch off', async () => {
      const result = appMockRenderer.render(
        <FormTestProvider onSubmit={onSubmit} defaultValue={dualDefaultValue}>
          <ConnectorFormFields
            actionTypeModel={dualActionTypeModel}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
            settingsContent={<div data-test-subj="custom-settings-content">Webhook URL</div>}
          />
        </FormTestProvider>
      );

      expect(result.getByTestId('connector-inbound-label')).toBeInTheDocument();
      expect(result.getByTestId('inbound-events-enabled-switch')).toBeInTheDocument();
      expect(result.getByTestId('inbound-events-enabled-switch')).not.toBeChecked();
      expect(result.queryByTestId('custom-settings-content')).not.toBeInTheDocument();
      expect(result.getByTestId('connector-outbound-label')).toBeInTheDocument();
      expect(result.queryByTestId('connector-settings-label')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(result.getByTestId('test-connector-text-field')).toBeInTheDocument();
      });
    });

    it('shows inbound fields when the switch is on', async () => {
      const result = appMockRenderer.render(
        <FormTestProvider onSubmit={onSubmit} defaultValue={dualDefaultValue}>
          <ConnectorFormFields
            actionTypeModel={dualActionTypeModel}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
            settingsContent={<div data-test-subj="custom-settings-content">Webhook URL</div>}
          />
        </FormTestProvider>
      );

      await userEvent.click(result.getByTestId('inbound-events-enabled-switch'));

      expect(result.getByTestId('inbound-events-enabled-switch')).toBeChecked();
      expect(result.getByTestId('custom-settings-content')).toBeInTheDocument();
    });

    it('warns when turning off a live inbound connector', async () => {
      const result = appMockRenderer.render(
        <FormTestProvider
          onSubmit={onSubmit}
          defaultValue={{ ...dualDefaultValue, isInboundEventsEnabled: true }}
        >
          <ConnectorFormFields
            actionTypeModel={dualActionTypeModel}
            isEdit
            registerPreSubmitValidator={() => {}}
            savedIsInboundEventsEnabled
            settingsContent={<div data-test-subj="custom-settings-content">Webhook URL</div>}
          />
        </FormTestProvider>
      );

      expect(result.queryByTestId('inbound-events-disable-warning')).not.toBeInTheDocument();
      await userEvent.click(result.getByTestId('inbound-events-enabled-switch'));
      expect(result.getByTestId('inbound-events-disable-warning')).toHaveTextContent('After save,');
    });

    it('hides inbound controls when the caller cannot reveal the ingest token', async () => {
      const result = appMockRenderer.render(
        <FormTestProvider onSubmit={onSubmit} defaultValue={dualDefaultValue}>
          <ConnectorFormFields
            actionTypeModel={dualActionTypeModel}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
            showInboundEvents={false}
          />
        </FormTestProvider>
      );

      expect(result.queryByTestId('inbound-events-enabled-switch')).not.toBeInTheDocument();
      expect(result.queryByTestId('connector-inbound-label')).not.toBeInTheDocument();
      expect(result.queryByTestId('connector-outbound-label')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(result.getByTestId('test-connector-text-field')).toBeInTheDocument();
      });
    });

    it('hides the inbound section when the cluster flag is off', async () => {
      appMockRenderer.coreStart.actions.isInboundEventsEnabled = false;

      const result = appMockRenderer.render(
        <FormTestProvider onSubmit={onSubmit} defaultValue={dualDefaultValue}>
          <ConnectorFormFields
            actionTypeModel={dualActionTypeModel}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
            settingsContent={<div data-test-subj="custom-settings-content">Webhook URL</div>}
          />
        </FormTestProvider>
      );

      expect(result.queryByTestId('connector-inbound-label')).not.toBeInTheDocument();
      expect(result.queryByTestId('inbound-events-enabled-switch')).not.toBeInTheDocument();
      expect(result.queryByTestId('custom-settings-content')).not.toBeInTheDocument();
      expect(result.getByTestId('connector-outbound-label')).toBeInTheDocument();
      await waitFor(() => {
        expect(result.getByTestId('test-connector-text-field')).toBeInTheDocument();
      });
    });
  });
});
