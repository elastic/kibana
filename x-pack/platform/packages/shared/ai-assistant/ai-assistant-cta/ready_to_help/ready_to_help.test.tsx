/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ReadyToHelp } from './ready_to_help';
import { translations } from './ready_to_help.translations';
import { EuiThemeProvider } from '@elastic/eui';

describe('ReadyToHelp', () => {
  it('renders with default type "stack"', () => {
    const { getByText } = render(<ReadyToHelp />, { wrapper: EuiThemeProvider });

    expect(getByText(translations.title)).toBeDefined();
    expect(getByText(translations.description)).toBeDefined();
  });

  it('renders with type "security"', () => {
    const { getByText } = render(<ReadyToHelp type="security" />, {
      wrapper: EuiThemeProvider,
    });

    expect(getByText(translations.title)).toBeDefined();
    expect(getByText(translations.securityDescription)).toBeDefined();
  });

  it('renders with type "observability"', () => {
    const { getByText } = render(<ReadyToHelp type="oblt" />, {
      wrapper: EuiThemeProvider,
    });

    expect(getByText(translations.title)).toBeDefined();
    expect(getByText(translations.observabilityDescription)).toBeDefined();
  });

  it('renders with type "search"', () => {
    const { getByText } = render(<ReadyToHelp type="search" />, {
      wrapper: EuiThemeProvider,
    });

    expect(getByText(translations.title)).toBeDefined();
    expect(getByText(translations.searchDescription)).toBeDefined();
  });
});
