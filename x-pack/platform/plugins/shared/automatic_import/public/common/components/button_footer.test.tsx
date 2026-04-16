/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ButtonsFooter } from './button_footer';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('ButtonsFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('action button', () => {
    it('should render action button', () => {
      const result = render(<ButtonsFooter />, { wrapper });
      const actionButton = result.getByTestId('buttonsFooter-actionButton');
      expect(actionButton).toBeInTheDocument();
    });

    it('should call onAction when clicked', () => {
      const mockOnAction = jest.fn();
      const result = render(<ButtonsFooter onAction={mockOnAction} />, { wrapper });
      const actionButton = result.getByTestId('buttonsFooter-actionButton');
      fireEvent.click(actionButton);
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('should render action button in loading state', () => {
      const result = render(<ButtonsFooter isActionLoading />, { wrapper });
      const actionButton = result.getByTestId('buttonsFooter-actionButton');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });

    it('should render action button without loading state', () => {
      const result = render(<ButtonsFooter isActionLoading={false} />, { wrapper });
      const actionButton = result.getByTestId('buttonsFooter-actionButton');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
    });

    it('should render action button as disabled when isActionDisabled is true', () => {
      const result = render(<ButtonsFooter isActionDisabled />, { wrapper });
      const actionButton = result.getByTestId('buttonsFooter-actionButton');
      expect(actionButton).toBeDisabled();
    });

    it('should render custom action button text', () => {
      const result = render(<ButtonsFooter actionButtonText="Submit" />, { wrapper });
      const actionButton = result.getByTestId('buttonsFooter-actionButton');
      expect(actionButton).toHaveTextContent('Submit');
    });
  });

  describe('cancel button', () => {
    it('should render cancel button by default', () => {
      const result = render(<ButtonsFooter />, { wrapper });
      const cancelButton = result.getByTestId('buttonsFooter-cancelButton');
      expect(cancelButton).toBeInTheDocument();
    });

    it('should call onCancel when clicked', () => {
      const mockOnCancel = jest.fn();
      const result = render(<ButtonsFooter onCancel={mockOnCancel} />, { wrapper });
      const cancelButton = result.getByTestId('buttonsFooter-cancelButton');
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should hide cancel button when hideCancel is true', () => {
      const result = render(<ButtonsFooter hideCancel />, { wrapper });
      expect(result.queryByTestId('buttonsFooter-cancelButton')).not.toBeInTheDocument();
    });

    it('should render custom cancel button text', () => {
      const result = render(<ButtonsFooter cancelButtonText="Go Back" />, { wrapper });
      const cancelButton = result.getByTestId('buttonsFooter-cancelButton');
      expect(cancelButton).toHaveTextContent('Go Back');
    });
  });
});
