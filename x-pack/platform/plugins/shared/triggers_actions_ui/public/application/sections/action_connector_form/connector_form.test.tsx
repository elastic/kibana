/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { ConnectorForm, formDeserializer, formSerializer } from './connector_form';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
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

  describe('serializers', () => {
    it('formSerializer works as expected for .gen-ai', () => {
      const formData = {
        actionTypeId: '.gen-ai',
        isDeprecated: false,
        config: {
          headers: [
            { key: 'foo', value: 'bar' },
            { key: 'an', value: 'tonio' },
          ],
        },
        secrets: {
          secretHeaders: [
            {
              key: 'foo',
              value: 'bar',
            },
          ],
        },
        isMissingSecrets: false,
      };

      expect(formSerializer(formData)).toEqual({
        actionTypeId: '.gen-ai',
        config: {
          headers: {
            foo: 'bar',
            an: 'tonio',
          },
        },
        isDeprecated: false,
        isMissingSecrets: false,
        secrets: {
          secretHeaders: undefined,
        },
      });
    });

    it('formDeserializer works as expected for .gen-ai', () => {
      const formData = {
        actionTypeId: '.gen-ai',
        isDeprecated: false,
        config: {
          headers: {
            foo: 'bar',
            an: 'tonio',
          },
        },
        secrets: {
          secretHeaders: {
            not: 'relevant',
          },
        },
        isMissingSecrets: false,
      };

      expect(formDeserializer(formData)).toEqual({
        actionTypeId: '.gen-ai',
        config: {
          headers: [
            {
              key: 'foo',
              type: 'config',
              value: 'bar',
            },
            {
              key: 'an',
              type: 'config',
              value: 'tonio',
            },
          ],
        },
        __internal__: {
          headers: [
            {
              key: 'foo',
              type: 'config',
              value: 'bar',
            },
            {
              key: 'an',
              type: 'config',
              value: 'tonio',
            },
          ],
        },
        isDeprecated: false,
        isMissingSecrets: false,
        secrets: {
          secretHeaders: {
            not: 'relevant',
          },
        },
      });
    });
  });
});
