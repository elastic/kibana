/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';

import { useDuplicateGuard } from './use_duplicate_guard';

const createMockCopyMutation = (
  overrides: Partial<{ mutateAsync: () => Promise<unknown>; isLoading: boolean }> = {}
) => ({
  mutateAsync: jest.fn().mockResolvedValue(undefined),
  isLoading: false,
  ...overrides,
});

interface TestComponentProps {
  copyMutation: { mutateAsync: () => Promise<unknown>; isLoading: boolean };
  resourceType: 'pack' | 'query';
}

const TestComponent = ({ copyMutation, resourceType }: TestComponentProps) => {
  const { handleDuplicateClick, handleDirtyStateChange, duplicateModal } = useDuplicateGuard({
    copyMutation,
    resourceType,
  });

  return (
    <div>
      <button onClick={handleDuplicateClick}>Duplicate</button>
      <button onClick={() => handleDirtyStateChange(true)}>Make dirty</button>
      <button onClick={() => handleDirtyStateChange(false)}>Make clean</button>
      {duplicateModal}
    </div>
  );
};

const renderWithProviders = (props: TestComponentProps) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <TestComponent {...props} />
      </IntlProvider>
    </EuiProvider>
  );

describe('useDuplicateGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDuplicateClick', () => {
    it('calls mutateAsync directly when form is clean', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      fireEvent.click(screen.getByText('Duplicate'));

      expect(copyMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('does not show modal when form is clean and duplicate is clicked', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      fireEvent.click(screen.getByText('Duplicate'));

      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
    });

    it('shows modal instead of calling mutateAsync when form is dirty', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      fireEvent.click(screen.getByText('Make dirty'));
      fireEvent.click(screen.getByText('Duplicate'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
      expect(copyMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('modal confirm', () => {
    it('calls mutateAsync and closes modal when user confirms', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      fireEvent.click(screen.getByText('Make dirty'));
      fireEvent.click(screen.getByText('Duplicate'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(copyMutation.mutateAsync).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
    });
  });

  describe('modal cancel', () => {
    it('closes modal without calling mutateAsync when user cancels', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      fireEvent.click(screen.getByText('Make dirty'));
      fireEvent.click(screen.getByText('Duplicate'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
      expect(copyMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleDirtyStateChange', () => {
    it('transitions back to clean state, calling mutateAsync directly on next click', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      act(() => {
        fireEvent.click(screen.getByText('Make dirty'));
        fireEvent.click(screen.getByText('Make clean'));
      });

      fireEvent.click(screen.getByText('Duplicate'));

      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
      expect(copyMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });

    it('transitions from clean to dirty so that modal appears on duplicate click', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      // Initially clean — no modal
      fireEvent.click(screen.getByText('Duplicate'));
      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
      expect(copyMutation.mutateAsync).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();

      // Become dirty — modal should appear
      fireEvent.click(screen.getByText('Make dirty'));
      fireEvent.click(screen.getByText('Duplicate'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
      expect(copyMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('duplicateModal', () => {
    it('is null (not rendered) when modal is not visible', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
    });

    it('displays the correct resourceType "pack" in the modal body', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      fireEvent.click(screen.getByText('Make dirty'));
      fireEvent.click(screen.getByText('Duplicate'));

      expect(
        screen.getByText(
          'Your unsaved changes will be lost. The duplicate will be based on the last saved version of this pack.'
        )
      ).toBeInTheDocument();
    });

    it('displays the correct resourceType "query" in the modal body', () => {
      const copyMutation = createMockCopyMutation();

      renderWithProviders({ copyMutation, resourceType: 'query' });

      fireEvent.click(screen.getByText('Make dirty'));
      fireEvent.click(screen.getByText('Duplicate'));

      expect(
        screen.getByText(
          'Your unsaved changes will be lost. The duplicate will be based on the last saved version of this query.'
        )
      ).toBeInTheDocument();
    });

    it('disables the confirm button when copyMutation.isLoading is true', () => {
      const copyMutation = createMockCopyMutation({ isLoading: true });

      renderWithProviders({ copyMutation, resourceType: 'pack' });

      fireEvent.click(screen.getByText('Make dirty'));
      fireEvent.click(screen.getByText('Duplicate'));

      const confirmButton = screen.getByTestId('confirmModalConfirmButton');
      expect(confirmButton).toBeDisabled();
    });
  });
});
