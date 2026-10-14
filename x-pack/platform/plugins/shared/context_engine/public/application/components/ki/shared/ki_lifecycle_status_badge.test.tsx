/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KiLifecycleStatusBadge } from './ki_lifecycle_status_badge';

const FIXED_NOW_MS = Date.parse('2026-06-15T12:00:00.000Z');

const renderBadge = (props: React.ComponentProps<typeof KiLifecycleStatusBadge>) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KiLifecycleStatusBadge {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('KiLifecycleStatusBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW_MS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders active for a non-deleted document with future expiry', () => {
    renderBadge({ expiresAt: '2030-01-01T00:00:00.000Z', 'data-test-subj': 'kiStatus' });
    expect(screen.getByTestId('kiStatus')).toHaveTextContent('active');
  });

  it('renders deleted when lifecycle is deleted', () => {
    renderBadge({ lifecycleStatus: 'deleted', 'data-test-subj': 'kiStatus' });
    expect(screen.getByTestId('kiStatus')).toHaveTextContent('deleted');
  });

  it('renders expired when expires_at is in the past', () => {
    renderBadge({ expiresAt: '2020-01-01T00:00:00.000Z', 'data-test-subj': 'kiStatus' });
    expect(screen.getByTestId('kiStatus')).toHaveTextContent('expired');
  });
});
