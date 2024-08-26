/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { copyToClipboard } from '@elastic/eui';

import { CopyToClipboardAction } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../mock/test_providers/test_providers';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    copyToClipboard: jest.fn(),
  };
});

describe('CopyToClipboardAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a copy to clipboard link', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <CopyToClipboardAction markdownComment="test comment" />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('copyToClipboard')).toHaveTextContent('Copy to clipboard');
  });

  describe('when ilm phases are not provided', () => {
    it('should render disabled copy to clipboard link', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ ilmPhases: [] }}>
            <CopyToClipboardAction markdownComment="test comment" />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      expect(screen.getByTestId('copyToClipboard')).toBeDisabled();
    });
  });

  describe('when copy to clipboard is clicked', () => {
    it('should copy the markdown comment to the clipboard and add success toast', () => {
      const addSuccessToast = jest.fn();
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ addSuccessToast }}>
            <CopyToClipboardAction markdownComment="test comment" />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      userEvent.click(screen.getByTestId('copyToClipboard'));

      expect(copyToClipboard).toHaveBeenCalledWith('test comment');
      expect(addSuccessToast).toHaveBeenCalledWith({ title: 'Copied results to the clipboard' });
    });
  });
});
