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
import { KiStatusBadge } from './ki_status_badge';

const renderBadge = (props: React.ComponentProps<typeof KiStatusBadge>) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KiStatusBadge {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('KiStatusBadge', () => {
  it.each([
    ['active', 'active'],
    ['deleted', 'deleted'],
    ['verification_failed', 'failed'],
    ['expired', 'expired'],
  ] as const)('renders %s as "%s"', (status, label) => {
    renderBadge({ status, 'data-test-subj': 'kiStatus' });
    expect(screen.getByTestId('kiStatus')).toHaveTextContent(label);
  });
});
