/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { waitFor, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectorForm } from './connector_form';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import type { AppMockRenderer } from '../test_utils';
import { createAppMockRenderer } from '../test_utils';

describe('ConnectorForm', () => {
  let appMockRenderer: AppMockRenderer;
  const onChange = jest.fn();
  const onFormModifiedChange = jest.fn();

  const connector = {
    actionTypeId: 'test',
    isDeprecated: false,
    config: {},
    secrets: {},
    isMissingSecrets: false,
    isConnectorTypeDeprecated: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };
  });

  it('calls on change with correct init state', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
    });

    appMockRenderer.render(
      <ConnectorForm
        actionTypeModel={actionTypeModel}
        isEdit={false}
        connector={connector}
        onChange={onChange}
        onFormModifiedChange={onFormModifiedChange}
      />
    );

    // Wait for the form to render to avoid suspended resources warnings from rtl
    expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();

    expect(onChange).toHaveBeenCalledWith({
      isSubmitted: false,
      isSubmitting: false,
      isValid: undefined,
      preSubmitValidator: null,
      submit: expect.anything(),
    });
    expect(onFormModifiedChange).toHaveBeenCalledWith(false);
  });

  it('calls onFormModifiedChange when form is modified', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
    });

    appMockRenderer.render(
      <ConnectorForm
        actionTypeModel={actionTypeModel}
        isEdit={false}
        connector={connector}
        onChange={onChange}
        onFormModifiedChange={onFormModifiedChange}
      />
    );

    const nameInput = screen.getByTestId('nameInput');
    expect(nameInput).toBeInTheDocument();

    await userEvent.type(nameInput, 'My connector', { delay: 100 });

    expect(onFormModifiedChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange when the form is invalid', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
    });

    const result = appMockRenderer.render(
      <ConnectorForm
        actionTypeModel={actionTypeModel}
        isEdit={false}
        connector={connector}
        onChange={onChange}
        onFormModifiedChange={onFormModifiedChange}
      />
    );

    expect(await result.findByTestId('nameInput')).toBeInTheDocument();

    await act(async () => {
      const submit = onChange.mock.calls[0][0].submit;
      await submit();
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        isSubmitted: true,
        isSubmitting: false,
        isValid: false,
        preSubmitValidator: expect.anything(),
        submit: expect.anything(),
      });
    });
  });

  it('registers the pre submit validator correctly', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
    });

    appMockRenderer.render(
      <ConnectorForm
        actionTypeModel={actionTypeModel}
        isEdit={false}
        connector={connector}
        onChange={onChange}
        onFormModifiedChange={onFormModifiedChange}
      />
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        isSubmitted: false,
        isSubmitting: false,
        isValid: undefined,
        preSubmitValidator: expect.anything(),
        submit: expect.anything(),
      });
    });
  });

  it('passes the serializers from the connector type model to the underlying form', async () => {
    const formSerializer = jest.fn((data) => data);
    const formDeserializer = jest.fn((data) => data);
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
      connectorForm: {
        serializer: formSerializer,
        deserializer: formDeserializer,
      },
    });

    appMockRenderer.render(
      <ConnectorForm
        actionTypeModel={actionTypeModel}
        isEdit={true}
        connector={connector}
        onChange={onChange}
        onFormModifiedChange={onFormModifiedChange}
      />
    );

    expect(formDeserializer).toHaveBeenCalled();

    // Without the name the form is invalid and doesn't submit
    await userEvent.type(screen.getByTestId('nameInput'), 'Name');

    await act(async () => {
      const submit = onChange.mock.calls[0][0].submit;
      await submit();
    });

    expect(formSerializer).toHaveBeenCalled();
  });
});
