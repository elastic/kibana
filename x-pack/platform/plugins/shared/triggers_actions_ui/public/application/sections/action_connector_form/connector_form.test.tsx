/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { ConnectorForm } from './connector_form';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../test_utils';

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('calls on change with correct init state', async () => {
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

    expect(result.getByTestId('nameInput')).toBeInTheDocument();
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
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };

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

    expect(result.getByTestId('nameInput')).toBeInTheDocument();
    await act(async () => {
      await userEvent.type(result.getByRole('textbox'), 'My connector', { delay: 100 });
    });

    await waitFor(() => {
      expect(onFormModifiedChange).toHaveBeenCalledWith(true);
    });
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

    expect(result.getByTestId('nameInput')).toBeInTheDocument();

    await act(async () => {
      const submit = onChange.mock.calls[0][0].submit;
      await submit();
    });

    await waitFor(() => expect(onChange).toHaveBeenCalled());

    expect(onChange).toHaveBeenCalledWith({
      isSubmitted: false,
      isSubmitting: false,
      isValid: false,
      preSubmitValidator: expect.anything(),
      submit: expect.anything(),
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
});
