/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import {
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
  ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS,
} from '../../../../common';

import { AccountTypeSelector, type AccountTypeSelectorProps } from './account_type_selector';

describe('AccountTypeSelector', () => {
  const mockOnChange = jest.fn();

  const defaultProps: AccountTypeSelectorProps = {
    selectedAccountType: ORGANIZATION_ACCOUNT,
    onChange: mockOnChange,
  };

  const renderSelector = (props: Partial<AccountTypeSelectorProps> = {}) => {
    return render(
      <I18nProvider>
        <AccountTypeSelector {...defaultProps} {...props} />
      </I18nProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders account type label', () => {
      renderSelector();
      expect(screen.getByText('Cloud connector account type')).toBeInTheDocument();
      expect(screen.getByText('Organization account')).toBeInTheDocument();
      expect(screen.getByText('Single account')).toBeInTheDocument();

      expect(screen.getByTestId(ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SELECTOR)).toBeInTheDocument();
      expect(
        screen.getByTestId(ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT)
      ).toBeInTheDocument();
    });
  });

  describe('selection behavior', () => {
    it('shows Organization as selected when selectedAccountType is organization-account', () => {
      renderSelector({ selectedAccountType: ORGANIZATION_ACCOUNT });

      const organizationWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION
      );
      const singleAccountWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT
      );

      const organizationRadio = organizationWrapper.querySelector('input') as HTMLInputElement;
      const singleAccountRadio = singleAccountWrapper.querySelector('input') as HTMLInputElement;

      expect(organizationRadio.checked).toBe(true);
      expect(singleAccountRadio.checked).toBe(false);
    });

    it('shows Single Account as selected when selectedAccountType is single-account', () => {
      renderSelector({ selectedAccountType: SINGLE_ACCOUNT });

      const organizationWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION
      );
      const singleAccountWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT
      );

      const organizationRadio = organizationWrapper.querySelector('input') as HTMLInputElement;
      const singleAccountRadio = singleAccountWrapper.querySelector('input') as HTMLInputElement;

      expect(organizationRadio.checked).toBe(false);
      expect(singleAccountRadio.checked).toBe(true);
    });
  });

  describe('onChange callback', () => {
    it('calls onChange with organization-account when Organization is clicked', () => {
      renderSelector({ selectedAccountType: SINGLE_ACCOUNT });

      const organizationWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION
      );
      const organizationRadio = organizationWrapper.querySelector('input') as HTMLInputElement;
      fireEvent.click(organizationRadio);

      expect(mockOnChange).toHaveBeenCalledWith(ORGANIZATION_ACCOUNT);
    });

    it('calls onChange with single-account when Single Account is clicked', () => {
      renderSelector({ selectedAccountType: ORGANIZATION_ACCOUNT });

      const singleAccountWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT
      );
      const singleAccountRadio = singleAccountWrapper.querySelector('input') as HTMLInputElement;
      fireEvent.click(singleAccountRadio);

      expect(mockOnChange).toHaveBeenCalledWith(SINGLE_ACCOUNT);
    });
  });

  describe('disabled state', () => {
    it('disables radio buttons when disabled prop is true', () => {
      renderSelector({ disabled: true });

      const organizationWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION
      );
      const singleAccountWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT
      );

      const organizationRadio = organizationWrapper.querySelector('input') as HTMLInputElement;
      const singleAccountRadio = singleAccountWrapper.querySelector('input') as HTMLInputElement;

      expect(organizationRadio.disabled).toBe(true);
      expect(singleAccountRadio.disabled).toBe(true);
    });

    it('enables radio buttons when disabled prop is false', () => {
      renderSelector({ disabled: false });

      const organizationWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION
      );
      const singleAccountWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT
      );

      const organizationRadio = organizationWrapper.querySelector('input') as HTMLInputElement;
      const singleAccountRadio = singleAccountWrapper.querySelector('input') as HTMLInputElement;

      expect(organizationRadio.disabled).toBe(false);
      expect(singleAccountRadio.disabled).toBe(false);
    });

    it('enables radio buttons by default when disabled prop is not provided', () => {
      renderSelector();

      const organizationWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.ORGANIZATION
      );
      const singleAccountWrapper = screen.getByTestId(
        ACCOUNT_TYPE_SELECTOR_TEST_SUBJECTS.SINGLE_ACCOUNT
      );

      const organizationRadio = organizationWrapper.querySelector('input') as HTMLInputElement;
      const singleAccountRadio = singleAccountWrapper.querySelector('input') as HTMLInputElement;

      expect(organizationRadio.disabled).toBe(false);
      expect(singleAccountRadio.disabled).toBe(false);
    });
  });
});
