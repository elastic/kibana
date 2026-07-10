/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarSectionSettingsButton } from './sidebar_section_settings_button';

describe('SidebarSectionSettingsButton', () => {
  it('renders a gear icon button with section settings aria label', () => {
    render(<SidebarSectionSettingsButton />);

    const button = screen.getByTestId('sidebar-section-settings-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Section settings');
  });

  it('supports a custom data-test-subj', () => {
    render(<SidebarSectionSettingsButton data-test-subj="custom-settings-button" />);

    expect(screen.getByTestId('custom-settings-button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();

    render(<SidebarSectionSettingsButton onClick={onClick} />);

    await userEvent.click(screen.getByTestId('sidebar-section-settings-button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
