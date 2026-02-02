/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { EmailInput } from './email_input';

const mockSecurityService = securityServiceMock.createStart();

const mockProps = {
  email: '',
  handleChangeEmail: jest.fn(),
};

describe('EmailInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render email input', () => {
    renderWithI18n(<EmailInput {...mockProps} />);

    expect(screen.getByTestId('feedbackEmailInput')).toBeInTheDocument();
  });

  it('should display the provided email value', () => {
    renderWithI18n(<EmailInput {...mockProps} email="capybara@elastic.co" />);

    expect(screen.getByTestId('feedbackEmailInput')).toHaveValue('capybara@elastic.co');
  });

  it('should call handleChangeEmail when input changes', async () => {
    renderWithI18n(<EmailInput {...mockProps} />);

    const input = screen.getByTestId('feedbackEmailInput');

    await userEvent.type(input, 'capybara@elastic.co');

    expect(mockProps.handleChangeEmail).toHaveBeenCalled();
  });

  it('should fetch user email from security service', async () => {
    mockSecurityService.authc.getCurrentUser.mockResolvedValue(
      securityServiceMock.createMockAuthenticatedUser({
        email: 'capybara@elastic.co',
      })
    );

    renderWithI18n(<EmailInput {...mockProps} security={mockSecurityService} />);

    await waitFor(() => {
      expect(mockSecurityService.authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockProps.handleChangeEmail).toHaveBeenCalledWith('capybara@elastic.co');
    });
  });

  it('should not fetch email if email is already provided', async () => {
    mockSecurityService.authc.getCurrentUser.mockResolvedValue(
      securityServiceMock.createMockAuthenticatedUser({
        email: 'not.capybara@elastic.co',
      })
    );

    renderWithI18n(
      <EmailInput {...mockProps} email="capybara@elastic.co" security={mockSecurityService} />
    );

    await waitFor(() => {
      expect(mockSecurityService.authc.getCurrentUser).not.toHaveBeenCalled();
    });
  });
});
