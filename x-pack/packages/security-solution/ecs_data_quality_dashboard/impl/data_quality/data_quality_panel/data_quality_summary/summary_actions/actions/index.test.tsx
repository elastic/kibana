/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../mock/test_providers/test_providers';
import { Props, Actions } from '.';

const mockCopyToClipboard = jest.fn((value) => true);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    copyToClipboard: (value: string) => mockCopyToClipboard(value),
  };
});

const ilmPhases = ['hot', 'warm', 'unmanaged'];

const defaultProps: Props = {
  addSuccessToast: jest.fn(),
  canUserCreateAndReadCases: () => true,
  getMarkdownComments: () => [],
  ilmPhases,
  openCreateCaseFlyout: jest.fn(),
};

describe('Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the action buttons are clicked', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );
    });

    test('it invokes openCreateCaseFlyout when the add to new case button is clicked', () => {
      const button = screen.getByTestId('addToNewCase');

      userEvent.click(button);

      expect(defaultProps.openCreateCaseFlyout).toBeCalled();
    });

    test('it invokes addSuccessToast when the copy to clipboard button is clicked', () => {
      const button = screen.getByTestId('copyToClipboard');

      userEvent.click(button);

      expect(defaultProps.addSuccessToast).toBeCalledWith({
        title: 'Copied results to the clipboard',
      });
    });
  });

  test('it disables the add to new case button when the user cannot create cases', () => {
    const canUserCreateAndReadCases = () => false;

    render(
      <TestProviders>
        <Actions {...defaultProps} canUserCreateAndReadCases={canUserCreateAndReadCases} />
      </TestProviders>
    );

    const button = screen.getByTestId('addToNewCase');

    expect(button).toBeDisabled();
  });

  test('it disables the add to new case button when `ilmPhases` is empty', () => {
    render(
      <TestProviders>
        <Actions {...defaultProps} ilmPhases={[]} />
      </TestProviders>
    );

    const button = screen.getByTestId('addToNewCase');

    expect(button).toBeDisabled();
  });

  test('it disables the copy to clipboard button when `ilmPhases` is empty', () => {
    render(
      <TestProviders>
        <Actions {...defaultProps} ilmPhases={[]} />
      </TestProviders>
    );

    const button = screen.getByTestId('copyToClipboard');

    expect(button).toBeDisabled();
  });
});
