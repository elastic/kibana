/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReadyToHelp } from './ready_to_help';
import { translations } from './ready_to_help.translations';
import { EuiThemeProvider } from '@elastic/eui';

describe('ReadyToHelp', () => {
  it('renders with default type "stack"', () => {
    render(<ReadyToHelp />, { wrapper: EuiThemeProvider });

    expect(screen.queryByText(translations.title)).toBeDefined();
    expect(screen.queryByText(translations.description)).toBeDefined();
  });

  it('renders with type "security"', () => {
    render(<ReadyToHelp type="security" />, {
      wrapper: EuiThemeProvider,
    });

    expect(screen.queryByText(translations.title)).toBeDefined();
    expect(screen.queryByText(translations.securityDescription)).toBeDefined();
  });

  it('renders with type "observability"', () => {
    render(<ReadyToHelp type="oblt" />, {
      wrapper: EuiThemeProvider,
    });

    expect(screen.queryByText(translations.title)).toBeDefined();
    expect(screen.queryByText(translations.observabilityDescription)).toBeDefined();
  });

  it('renders with type "search"', () => {
    render(<ReadyToHelp type="search" />, {
      wrapper: EuiThemeProvider,
    });

    expect(screen.queryByText(translations.title)).toBeDefined();
    expect(screen.queryByText(translations.searchDescription)).toBeDefined();
  });
});
