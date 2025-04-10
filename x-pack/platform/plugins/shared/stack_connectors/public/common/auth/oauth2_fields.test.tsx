/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OAuth2Fields } from './oauth2_fields';
import * as i18n from './translations';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';

describe('OAuth2Fields', () => {
  const onSubmit = jest.fn();

  it('renders all fields with correct labels', () => {
    const testFormData = {
      config: {
        hasAuth: false,
        authType: null,
        accessTokenUrl: '', // Default to an empty string
        clientId: '', // Default to an empty string
        clientSecret: '', // Default to an empty string
        scope: '', // Default to an empty string
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <OAuth2Fields readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(screen.getByLabelText(i18n.ACCESS_TOKEN_URL)).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.CLIENT_ID)).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.CLIENT_SECRET)).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.SCOPE)).toBeInTheDocument();
  });

  it('sets fields to read-only when readOnly is true', () => {
    const testFormData = {
      config: {
        hasAuth: false,
        authType: null,
        accessTokenUrl: '', // Default to an empty string
        clientId: '', // Default to an empty string
        clientSecret: '', // Default to an empty string
        scope: '', // Default to an empty string
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <OAuth2Fields readOnly={true} />
      </AuthFormTestProvider>
    );

    expect(screen.getByLabelText(i18n.ACCESS_TOKEN_URL)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_ID)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_SECRET)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.SCOPE)).toHaveAttribute('readonly');
  });

  it('does not set fields to read-only when readOnly is false', () => {
    const testFormData = {
      config: {
        hasAuth: false,
        authType: null,
        accessTokenUrl: '', // Default to an empty string
        clientId: '', // Default to an empty string
        clientSecret: '', // Default to an empty string
        scope: '', // Default to an empty string
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <OAuth2Fields readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(screen.getByLabelText(i18n.ACCESS_TOKEN_URL)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_ID)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_SECRET)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.SCOPE)).not.toHaveAttribute('readonly');
  });
});
