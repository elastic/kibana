/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OAuth2Fields, jsonValidator } from './oauth2_fields';
import * as i18n from './translations';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';

describe('OAuth2Fields', () => {
  const onSubmit = jest.fn();
  const baseFormData = {
    config: {
      hasAuth: true,
      authType: 'oauth2',
      accessTokenUrl: 'test-url',
      clientId: 'test-client',

      scope: '',
    },
    secrets: {
      clientSecret: 'test-secret',
    },
  };

  it('renders all fields with correct labels', () => {
    render(
      <AuthFormTestProvider defaultValue={baseFormData} onSubmit={onSubmit}>
        <OAuth2Fields readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(screen.getByLabelText(i18n.ACCESS_TOKEN_URL)).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.CLIENT_ID)).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.CLIENT_SECRET)).toBeInTheDocument();
    expect(screen.getByLabelText(i18n.SCOPE)).toBeInTheDocument();
    expect(screen.getByText(i18n.ADDITIONAL_FIELDS)).toBeInTheDocument();
  });

  it('does not set fields to read-only when readOnly is false', () => {
    render(
      <AuthFormTestProvider defaultValue={baseFormData} onSubmit={onSubmit}>
        <OAuth2Fields readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(screen.getByLabelText(i18n.ACCESS_TOKEN_URL)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_ID)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_SECRET)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.SCOPE)).not.toHaveAttribute('readonly');
  });
});

describe('jsonValidator', () => {
  it('returns undefined for empty value', () => {
    expect(jsonValidator({ value: undefined })).toBeUndefined();
    expect(jsonValidator({ value: null })).toBeUndefined();
    expect(jsonValidator({ value: '' })).toBeUndefined();
  });

  it('returns undefined for valid JSON object', () => {
    expect(jsonValidator({ value: '{"foo":"bar"}' })).toBeUndefined();
    expect(jsonValidator({ value: '{}' })).toBeUndefined();
  });

  it('returns error for invalid JSON', () => {
    expect(jsonValidator({ value: '{foo:bar}' })).toEqual({ message: i18n.INVALID_JSON });
    expect(jsonValidator({ value: '{' })).toEqual({ message: i18n.INVALID_JSON });
  });

  it('returns error for JSON array', () => {
    expect(jsonValidator({ value: '["foo","bar"]' })).toEqual({ message: i18n.INVALID_JSON });
    expect(jsonValidator({ value: '[]' })).toEqual({ message: i18n.INVALID_JSON });
  });

  it('returns error for JSON number or string', () => {
    expect(jsonValidator({ value: '"foo"' })).toEqual({ message: i18n.INVALID_JSON });
    expect(jsonValidator({ value: '123' })).toEqual({ message: i18n.INVALID_JSON });
    expect(jsonValidator({ value: 'true' })).toEqual({ message: i18n.INVALID_JSON });
  });
});
