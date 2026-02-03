/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { EmailSection } from './email_section';

const mockProps = {
  email: '',
  allowEmailContact: false,
  handleChangeAllowEmailContact: jest.fn(),
  handleChangeEmail: jest.fn(),
};

describe('EmailSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render email consent checkbox', () => {
    renderWithI18n(<EmailSection {...mockProps} />);

    expect(screen.getByTestId('feedbackEmailConsentCheckbox')).toBeInTheDocument();
  });

  it('should not show email input when allowEmailContact is false', () => {
    renderWithI18n(<EmailSection {...mockProps} />);

    expect(screen.queryByTestId('feedbackEmailInput')).not.toBeInTheDocument();
  });

  it('should show email input when allowEmailContact is true', () => {
    renderWithI18n(<EmailSection {...mockProps} allowEmailContact={true} />);

    expect(screen.getByTestId('feedbackEmailInput')).toBeInTheDocument();
  });

  it('should call onEmailValidationChange when validation changes', () => {
    const onEmailValidationChange = jest.fn();
    renderWithI18n(
      <EmailSection
        {...mockProps}
        allowEmailContact={true}
        email="capybara@elastic.co"
        onEmailValidationChange={onEmailValidationChange}
      />
    );

    expect(onEmailValidationChange).toHaveBeenCalled();
  });
});
