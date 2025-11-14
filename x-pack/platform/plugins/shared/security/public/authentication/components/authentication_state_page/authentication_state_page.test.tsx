/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { AuthenticationStatePage } from './authentication_state_page';

describe('AuthenticationStatePage', () => {
  it('renders the title, child content, and layout elements correctly', () => {
    const { container } = renderWithI18n(
      <AuthenticationStatePage title="foo">
        <span>hello world</span>
      </AuthenticationStatePage>
    );

    // Page wrapper with expected class
    const wrapper = container.querySelector('[data-test-subj="secAuthenticationStatePage"]');
    expect(wrapper).toBeInTheDocument();

    // Header section
    const header = container.querySelector('[data-test-subj="secAuthenticationStatePageHeader"]');
    expect(header).toBeInTheDocument();

    // Title in <h1>
    const title = screen.getByRole('heading', { level: 1, name: 'foo' });
    expect(title).toBeInTheDocument();

    // Child content
    expect(screen.getByText('hello world')).toBeInTheDocument();

    // Icon wrapper with logo class
    const logoWrapper = container.querySelector(
      '[data-test-subj="secAuthenticationStatePageLogo"]'
    );
    expect(logoWrapper).toBeInTheDocument();

    // Check the EuiIcon is rendered with correct type
    const icon = logoWrapper?.querySelector('[data-euiicon-type="logoElastic"]');
    expect(icon).toBeInTheDocument();
  });
});
