/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InheritLifecycleSection } from './inherit_lifecycle_section';

describe('InheritLifecycleSection', () => {
  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  it('calls onChange when checkbox is toggled', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    renderWithTheme(<InheritLifecycleSection value={false} onChange={onChange} label="Inherit" />);

    await user.click(screen.getByRole('checkbox', { name: 'Inherit' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders the link with the provided href', () => {
    renderWithTheme(
      <InheritLifecycleSection
        value={false}
        onChange={() => {}}
        label="Inherit"
        link={{ label: 'View', href: '#myHref' }}
      />
    );

    expect(screen.getByRole('link', { name: /View/ })).toHaveAttribute('href', '#myHref');
  });
});
