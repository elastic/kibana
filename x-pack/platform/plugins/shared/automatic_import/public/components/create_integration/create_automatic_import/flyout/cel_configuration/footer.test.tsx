/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { Footer } from './footer';
import { ActionsProvider } from '../../state';
import { mockActions } from '../../mocks/state';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when rendered everything enabled', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <Footer
          isFlyoutGenerating={false}
          isValid={false}
          isGenerationComplete={false}
          showHint={false}
          hint={''}
          onCancel={() => {}}
          onSave={() => {}}
        />,
        {
          wrapper,
        }
      );
    });
    it('should render cancel button', () => {
      expect(result.queryByTestId('footer-cancelButton')).toBeInTheDocument();
    });

    it('should render save button', () => {
      expect(result.queryByTestId('footer-saveButton')).toBeInTheDocument();
    });

    it('should not render hint', () => {
      expect(result.queryByTestId('footer-showHint')).not.toBeInTheDocument();
    });
  });

  describe('when rendered with show validation', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <Footer
          isFlyoutGenerating={false}
          isValid={false}
          isGenerationComplete={false}
          showHint={true}
          hint={''}
          onCancel={() => {}}
          onSave={() => {}}
        />,
        {
          wrapper,
        }
      );
    });
    it('should render enabled cancel button', () => {
      expect(result.queryByTestId('footer-cancelButton')).toBeInTheDocument();
    });

    it('should render disabled save button', () => {
      expect(result.queryByTestId('footer-saveButton')).toBeDisabled();
    });

    it('should render hint', () => {
      expect(result.queryByTestId('footer-showHint')).toBeInTheDocument();
    });
  });

  describe('when rendered while generating', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <Footer
          isFlyoutGenerating={true}
          isValid={false}
          isGenerationComplete={false}
          showHint={false}
          hint={''}
          onCancel={() => {}}
          onSave={() => {}}
        />,
        {
          wrapper,
        }
      );
    });
    it('should render enabled cancel button', () => {
      expect(result.queryByTestId('footer-cancelButton')).toBeInTheDocument();
    });

    it('should render disabled save button', () => {
      expect(result.queryByTestId('footer-saveButton')).toBeDisabled();
    });

    it('should render hint', () => {
      expect(result.queryByTestId('footer-showHint')).not.toBeInTheDocument();
    });
  });
});
