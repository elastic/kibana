/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';

import { I18nProvider } from '@kbn/i18n-react';

import { SessionExpirationModal } from './session_expiration_modal';
import type { SessionState } from './session_timeout';

describe('SessionExpirationModal', () => {
  it('renders modal when session state is available', () => {
    const sessionState$ = of<SessionState>({
      lastExtensionTime: Date.now(),
      expiresInMs: 60 * 1000,
      canBeExtended: true,
    });
    const onExtend = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <I18nProvider>
        <SessionExpirationModal
          sessionState$={sessionState$}
          onExtend={onExtend}
          onClose={onClose}
        />
      </I18nProvider>
    );

    const extendButton = getByTestId('session-expiration-extend-button');

    expect(extendButton).toHaveTextContent('Stay logged in');
    expect(extendButton).toHaveFocus();
  });

  it('renders null when session state is not available', () => {
    const sessionState$ = of(null);
    const onExtend = jest.fn();
    const onClose = jest.fn();

    const { container } = render(
      <I18nProvider>
        <SessionExpirationModal
          // @ts-expect-error - we want to test the null case
          sessionState$={sessionState$}
          onExtend={onExtend}
          onClose={onClose}
        />
      </I18nProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders null when expiresInMs is not available', () => {
    const sessionState$ = of<SessionState>({
      lastExtensionTime: Date.now(),
      expiresInMs: null,
      canBeExtended: true,
    });
    const onExtend = jest.fn();
    const onClose = jest.fn();

    const { container } = render(
      <I18nProvider>
        <SessionExpirationModal
          sessionState$={sessionState$}
          onExtend={onExtend}
          onClose={onClose}
        />
      </I18nProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('has proper accessibility attributes', () => {
    const sessionState$ = of<SessionState>({
      lastExtensionTime: Date.now(),
      expiresInMs: 60 * 1000,
      canBeExtended: true,
    });
    const onExtend = jest.fn();
    const onClose = jest.fn();

    const { queryByRole, getByText } = render(
      <I18nProvider>
        <SessionExpirationModal
          sessionState$={sessionState$}
          onExtend={onExtend}
          onClose={onClose}
        />
      </I18nProvider>
    );

    const modal = queryByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby', 'session-expiration-modal-title');
    expect(getByText('Session timeout')).toHaveAttribute('id', 'session-expiration-modal-title');
  });
});
