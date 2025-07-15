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
    const wrapper = container.querySelector('.secAuthenticationStatePage');
    expect(wrapper).toBeInTheDocument();

    // Header section
    const header = container.querySelector('.secAuthenticationStatePage__header');
    expect(header).toBeInTheDocument();

    // Title in <h1>
    const title = screen.getByRole('heading', { level: 1, name: 'foo' });
    expect(title).toBeInTheDocument();

    // Child content
    expect(screen.getByText('hello world')).toBeInTheDocument();

    // Icon wrapper with logo class
    const logoWrapper = container.querySelector('.secAuthenticationStatePage__logo');
    expect(logoWrapper).toBeInTheDocument();

    // Check the EuiIcon is rendered with correct type
    const icon = logoWrapper?.querySelector('[data-euiicon-type="logoElastic"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders with custom CSS class', () => {
    const { container } = renderWithI18n(
      <AuthenticationStatePage className="customClassName" title={'foo'}>
        <span>hello world</span>
      </AuthenticationStatePage>
    );
    expect(
      container.querySelector('.secAuthenticationStatePage.customClassName')
    ).toBeInTheDocument();
  });
});
