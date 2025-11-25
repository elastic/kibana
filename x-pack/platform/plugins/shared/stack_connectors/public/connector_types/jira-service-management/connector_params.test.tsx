/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import JiraServiceManagementConnectorFields from './connector_params';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const actionConnector = {
  actionTypeId: '.jira-service-management',
  name: 'jira-service-management',
  config: {},
  secrets: {
    apiKey: 'secret',
  },
  isDeprecated: false,
};

describe('JiraServiceManagementConnectorFields renders', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the fields', async () => {
    render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <JiraServiceManagementConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('secrets.apiKey-input')).toBeInTheDocument();
  });

  describe('Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <JiraServiceManagementConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            actionTypeId: '.jira-service-management',
            name: 'jira-service-management',
            config: {},
            secrets: {
              apiKey: 'secret',
            },
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it('validates correctly secrets.apiKey-input', async () => {
      const field = 'secrets.apiKey-input';
      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <JiraServiceManagementConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(res.getByTestId(field));
      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
