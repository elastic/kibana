/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../mocks/test_provider';
import { ButtonsFooter } from './buttons_footer';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>{children}</TestProvider>
);

describe('ButtonsFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when next button is loading', () => {
    let result: RenderResult;
    const mockOnNext = jest.fn();

    beforeEach(() => {
      result = render(<ButtonsFooter onNext={mockOnNext} isNextLoading />, {
        wrapper,
      });
    });

    it('should render next button in loading state', () => {
      const nextButton = result.getByTestId('buttonsFooter-nextButton');
      expect(nextButton).toBeInTheDocument();
      // EuiButton with isLoading prop adds a loading spinner
      expect(nextButton.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });
  });

  describe('when next button is not loading', () => {
    let result: RenderResult;
    const mockOnNext = jest.fn();

    beforeEach(() => {
      result = render(<ButtonsFooter onNext={mockOnNext} isNextLoading={false} />, {
        wrapper,
      });
    });

    it('should render next button without loading state', () => {
      const nextButton = result.getByTestId('buttonsFooter-nextButton');
      expect(nextButton).toBeInTheDocument();
      expect(nextButton.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
    });
  });
});
