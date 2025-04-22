/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OAuth2Fields } from './oauth2_fields';
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

  it.skip('sets fields to read-only when readOnly is true', async () => {
    const user = userEvent.setup();
    render(
      <AuthFormTestProvider defaultValue={baseFormData} onSubmit={onSubmit}>
        <OAuth2Fields readOnly={true} />
      </AuthFormTestProvider>
    );

    expect(screen.getByLabelText(i18n.ACCESS_TOKEN_URL)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_ID)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.CLIENT_SECRET)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(i18n.SCOPE)).toHaveAttribute('readonly');

    const additionalFieldsRow = screen.getByTestId('additionalFields');

    const editorContainer = await within(additionalFieldsRow).findByRole('textbox');

    await user.click(editorContainer);

    await user.type(editorContainer, 't', { delay: 50 });

    const readOnlyMessage = await screen.findByText(
      'Cannot edit in read-only editor',
      {},
      { timeout: 2000 }
    );

    expect(readOnlyMessage).toBeInTheDocument();
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
