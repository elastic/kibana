/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { createSessionExpirationToast, SessionExpirationToast } from './session_expiration_toast';
import type { SessionState } from './session_timeout';

describe('createSessionExpirationToast', () => {
  it('creates a toast', () => {
    const coreStart = coreMock.createStart();
    const sessionState$ = of<SessionState>({
      lastExtensionTime: Date.now(),
      expiresInMs: 60 * 1000,
      canBeExtended: true,
    });
    const onClose = jest.fn();
    const toast = createSessionExpirationToast(coreStart, sessionState$, onClose);

    expect(toast).toEqual(
      expect.objectContaining({
        color: 'warning',
        iconType: 'clock',
        onClose: expect.any(Function),
        text: expect.any(Function),
        title: expect.any(String),
        toastLifeTimeMs: 2147483647,
      })
    );
  });
});

describe('SessionExpirationToast', () => {
  it('renders session expiration time in minutes when >= 60s remaining', () => {
    const sessionState$ = of<SessionState>({
      lastExtensionTime: Date.now(),
      expiresInMs: 60 * 2000,
      canBeExtended: true,
    });

    const { getByText } = render(
      <I18nProvider>
        <SessionExpirationToast sessionState$={sessionState$} />
      </I18nProvider>
    );
    getByText(/You will be logged out in [0-9]+ minutes/);
  });

  it('renders session expiration time in seconds when < 60s remaining', () => {
    const sessionState$ = of<SessionState>({
      lastExtensionTime: Date.now(),
      expiresInMs: 60 * 900,
      canBeExtended: true,
    });

    const { getByText } = render(
      <I18nProvider>
        <SessionExpirationToast sessionState$={sessionState$} />
      </I18nProvider>
    );
    getByText(/You will be logged out in [0-9]+ seconds/);
  });

  it('does not render extend button if session cannot be extended', () => {
    const sessionState$ = of<SessionState>({
      lastExtensionTime: Date.now(),
      expiresInMs: 60 * 1000,
      canBeExtended: false,
    });

    const { queryByRole } = render(
      <I18nProvider>
        <SessionExpirationToast sessionState$={sessionState$} />
      </I18nProvider>
    );
    expect(queryByRole('button', { name: 'Stay logged in' })).toBeNull();
  });
});
