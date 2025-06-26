/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../mocks/test_provider';
import { Footer } from './footer';
import { ActionsProvider } from '../state';
import { mockActions } from '../mocks/state';

const mockNavigate = jest.fn();
jest.mock('../../../../common/hooks/use_navigate', () => ({
  ...jest.requireActual('../../../../common/hooks/use_navigate'),
  useNavigate: () => mockNavigate,
}));

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when rendered for the most common case', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(<Footer isNextStepEnabled />, {
        wrapper,
      });
    });
    it('should render footer buttons component', () => {
      expect(result.queryByTestId('buttonsFooter')).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      expect(result.queryByTestId('buttonsFooter-cancelButton')).toBeInTheDocument();
    });

    it('should render back button', () => {
      expect(result.queryByTestId('buttonsFooter-backButton')).toBeInTheDocument();
    });

    it('should render next button', () => {
      expect(result.queryByTestId('buttonsFooter-nextButton')).toBeInTheDocument();
    });
  });
});
