/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { HeaderActionButtonProps } from '@kbn/core-chrome-browser-components';

import { UserMenuComponent } from './user_menu_component';

jest.mock('@kbn/core-chrome-browser-components', () => ({
  HeaderActionButton: ({ children, ...props }: HeaderActionButtonProps) => (
    <button {...props} data-test-subj={props['data-test-subj']}>
      {children}
    </button>
  ),
}));

describe('UserMenuComponent', () => {
  const defaultProps = {
    isOpen: false,
    toggleMenu: jest.fn(),
    avatar: <span data-test-subj="mockAvatar">A</span>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the avatar inside a HeaderActionButton', () => {
    render(<UserMenuComponent {...defaultProps} />);

    expect(screen.getByTestId('chromeNextUserMenuHeaderButton')).toBeInTheDocument();
    expect(screen.getByTestId('mockAvatar')).toBeInTheDocument();
  });

  it('should call toggleMenu on click', async () => {
    const user = userEvent.setup();
    render(<UserMenuComponent {...defaultProps} />);

    await user.click(screen.getByTestId('chromeNextUserMenuHeaderButton'));
    expect(defaultProps.toggleMenu).toHaveBeenCalledTimes(1);
  });
});
