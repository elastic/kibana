/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { waitFor, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as useFormModule from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/hooks/use_form';
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
    const useFormSpy = jest.spyOn(useFormModule, 'useForm');
    const formSerializer = jest.fn((data) => data);
    const formDeserializer = jest.fn((data) => data);
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      actionConnectorFields: lazy(() => import('./connector_mock')),
      formSerializer,
      formDeserializer,
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
    await screen.findByTestId('test-connector-text-field');

    expect(useFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        serializer: formSerializer,
        deserializer: formDeserializer,
      })
    );
  });
});
