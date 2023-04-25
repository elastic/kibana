/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import { ErrorsPopover } from '.';

const mockCopyToClipboard = jest.fn((value) => true);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    copyToClipboard: (value: string) => mockCopyToClipboard(value),
  };
});

const errorSummary = [
  {
    pattern: '.alerts-security.alerts-default',
    indexName: null,
    error: 'Error loading stats: Error: Forbidden',
  },
];

describe('ErrorsPopover', () => {
  beforeEach(() => {
    document.execCommand = jest.fn();
  });

  test('it disables the view errors button when `errorSummary` is empty', () => {
    render(
      <TestProviders>
        <ErrorsPopover addSuccessToast={jest.fn()} errorSummary={[]} />
      </TestProviders>
    );

    expect(screen.getByTestId('viewErrors')).toBeDisabled();
  });

  test('it enables the view errors button when `errorSummary` is NOT empty', () => {
    render(
      <TestProviders>
        <ErrorsPopover addSuccessToast={jest.fn()} errorSummary={errorSummary} />
      </TestProviders>
    );

    expect(screen.getByTestId('viewErrors')).not.toBeDisabled();
  });

  describe('popover content', () => {
    const addSuccessToast = jest.fn();

    beforeEach(() => {
      jest.resetAllMocks();

      render(
        <TestProviders>
          <ErrorsPopover addSuccessToast={addSuccessToast} errorSummary={errorSummary} />
        </TestProviders>
      );

      const viewErrorsButton = screen.getByTestId('viewErrors');

      act(() => {
        userEvent.click(viewErrorsButton);
      });
    });

    test('it renders the expected callout content', () => {
      expect(screen.getByTestId('callout')).toHaveTextContent(
        "ErrorsSome indices were not checked for Data QualityErrors may occur when pattern or index metadata is temporarily unavailable, or because you don't have the privileges required for accessThe following privileges are required to check an index:monitor or manageview_index_metadatareadCopy to clipboard"
      );
    });

    test('it invokes `addSuccessToast` when the copy button is clicked', () => {
      const copyToClipboardButton = screen.getByTestId('copyToClipboard');
      act(() => {
        userEvent.click(copyToClipboardButton, undefined, { skipPointerEventsCheck: true });
      });

      expect(addSuccessToast).toBeCalledWith({ title: 'Copied errors to the clipboard' });
    });

    test('it renders the expected error summary text in the errors viewer', () => {
      expect(screen.getByTestId('errorsViewer').textContent?.includes(errorSummary[0].error)).toBe(
        true
      );
    });
  });
});
