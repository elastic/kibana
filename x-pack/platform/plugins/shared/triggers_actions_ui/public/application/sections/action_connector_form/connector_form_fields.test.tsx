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
import { AppMockRenderer, createAppMockRenderer } from '../test_utils';

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
});
