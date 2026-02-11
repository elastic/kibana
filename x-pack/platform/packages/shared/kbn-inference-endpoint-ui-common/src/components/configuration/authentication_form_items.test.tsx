/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AuthenticationFormItems } from './authentication_form_items';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ConfigEntryView } from '../../types/types';

describe('AuthenticationFormItems', () => {
  const mockRequiredAuthItems = [
    {
      key: 'secret_key',
      isValid: true,
      validationErrors: [],
      value: null,
      default_value: null,
      description: 'A valid AWS secret key that is paired with the access_key.',
      label: 'Secret Key',
      required: true,
      sensitive: true,
      updatable: true,
      type: 'str',
      supported_task_types: ['text_embedding', 'completion'],
    },
    {
      key: 'access_key',
      isValid: true,
      validationErrors: [],
      value: null,
      default_value: null,
      description: 'A valid AWS access key that has permissions to use Amazon Bedrock.',
      label: 'Access Key',
      required: true,
      sensitive: true,
      updatable: true,
      type: 'str',
      supported_task_types: ['text_embedding', 'completion'],
    },
  ];
  const mockOptionalAuthItems = [
    {
      key: 'api_key',
      isValid: true,
      validationErrors: [],
      value: null,
      default_value: null,
      description: 'You must provide either an API key or an Entra ID.',
      label: 'API Key',
      required: false,
      sensitive: true,
      updatable: true,
      type: 'str',
      supported_task_types: ['text_embedding', 'completion'],
    },
    {
      key: 'entra_id',
      isValid: true,
      validationErrors: [],
      value: null,
      default_value: null,
      description: 'You must provide either an API key or an Entra ID.',
      label: 'Entra ID',
      required: false,
      sensitive: true,
      updatable: true,
      type: 'str',
      supported_task_types: ['text_embedding', 'completion'],
    },
  ];

  const defaultProps = {
    isLoading: false,
    setConfigEntry: jest.fn(),
    reenterSecretsOnEdit: true,
  };

  it('should render all required auth fields without auth type selector', () => {
    render(
      <IntlProvider>
        <AuthenticationFormItems
          {...defaultProps}
          items={mockRequiredAuthItems as ConfigEntryView[]}
        />
      </IntlProvider>
    );
    expect(screen.getByTestId('authentication-label')).toBeInTheDocument();
    expect(screen.queryByTestId('authTypeSelect')).not.toBeInTheDocument();
    expect(screen.getByTestId('configuration-formrow-secret_key')).toBeInTheDocument();
    expect(screen.getByTestId('configuration-formrow-access_key')).toBeInTheDocument();
  });

  it('should render single required auth field without auth type selector', () => {
    render(
      <IntlProvider>
        <AuthenticationFormItems
          {...defaultProps}
          items={[mockRequiredAuthItems[0]] as ConfigEntryView[]}
        />
      </IntlProvider>
    );
    expect(screen.getByTestId('authentication-label')).toBeInTheDocument();
    expect(screen.queryByTestId('authTypeSelect')).not.toBeInTheDocument();
    expect(screen.getByTestId('configuration-formrow-secret_key')).toBeInTheDocument();
  });

  it('should allow selection of auth type field when multiple optional fields present', () => {
    render(
      <IntlProvider>
        <AuthenticationFormItems
          {...defaultProps}
          items={mockOptionalAuthItems as ConfigEntryView[]}
        />
      </IntlProvider>
    );
    expect(screen.getByTestId('authentication-label')).toBeInTheDocument();
    expect(screen.getByTestId('authTypeSelect')).toBeInTheDocument();
    expect(screen.getByTestId('configuration-formrow-api_key')).toBeInTheDocument();
  });
});
