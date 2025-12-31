/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { LicenseWarningNotice } from './license_warning_notice';

describe('License Error Notice', () => {
  it('renders', () => {
    render(
      <I18nProvider>
        <LicenseWarningNotice />
      </I18nProvider>
    );

    expect(screen.getByText('License error')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'register a license' })).toBeInTheDocument();
  });
});
