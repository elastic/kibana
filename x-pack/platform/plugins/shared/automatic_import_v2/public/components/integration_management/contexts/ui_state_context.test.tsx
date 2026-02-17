/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { UIStateProvider, useUIState } from './ui_state_context';

describe('UIStateContext', () => {
  describe('useUIState', () => {
    it('should throw error when used outside UIStateProvider', () => {
      // Suppress console.error for this test since we expect it to throw
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useUIState());
      }).toThrow('useUIState must be used within a UIStateProvider');

      consoleSpy.mockRestore();
    });

    it('should return context value when used within UIStateProvider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UIStateProvider>{children}</UIStateProvider>
      );

      const { result } = renderHook(() => useUIState(), { wrapper });

      expect(result.current).toEqual({
        isCreateDataStreamFlyoutOpen: false,
        openCreateDataStreamFlyout: expect.any(Function),
        closeCreateDataStreamFlyout: expect.any(Function),
        isEditPipelineFlyoutOpen: false,
        selectedDataStream: null,
        openEditPipelineFlyout: expect.any(Function),
        closeEditPipelineFlyout: expect.any(Function),
        selectedPipelineTab: 'table',
        selectPipelineTab: expect.any(Function),
      });
    });
  });

  describe('UIStateProvider', () => {
    it('should have flyout closed by default', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UIStateProvider>{children}</UIStateProvider>
      );

      const { result } = renderHook(() => useUIState(), { wrapper });

      expect(result.current.isCreateDataStreamFlyoutOpen).toBe(false);
    });

    it('should set flyout open when openCreateDataStreamFlyout is called', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UIStateProvider>{children}</UIStateProvider>
      );

      const { result } = renderHook(() => useUIState(), { wrapper });

      expect(result.current.isCreateDataStreamFlyoutOpen).toBe(false);

      act(() => {
        result.current.openCreateDataStreamFlyout();
      });

      expect(result.current.isCreateDataStreamFlyoutOpen).toBe(true);
    });

    it('should set flyout closed when closeCreateDataStreamFlyout is called', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UIStateProvider>{children}</UIStateProvider>
      );

      const { result } = renderHook(() => useUIState(), { wrapper });

      // First open the flyout
      act(() => {
        result.current.openCreateDataStreamFlyout();
      });
      expect(result.current.isCreateDataStreamFlyoutOpen).toBe(true);

      // Then close it
      act(() => {
        result.current.closeCreateDataStreamFlyout();
      });
      expect(result.current.isCreateDataStreamFlyoutOpen).toBe(false);
    });

    it('should provide stable function references', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UIStateProvider>{children}</UIStateProvider>
      );

      const { result, rerender } = renderHook(() => useUIState(), { wrapper });

      const firstOpenFn = result.current.openCreateDataStreamFlyout;
      const firstCloseFn = result.current.closeCreateDataStreamFlyout;

      // Trigger a re-render
      rerender();

      expect(result.current.openCreateDataStreamFlyout).toBe(firstOpenFn);
      expect(result.current.closeCreateDataStreamFlyout).toBe(firstCloseFn);
    });
  });

  describe('integration with component', () => {
    const TestComponent: React.FC = () => {
      const {
        isCreateDataStreamFlyoutOpen,
        openCreateDataStreamFlyout,
        closeCreateDataStreamFlyout,
      } = useUIState();

      return (
        <div>
          <span data-test-subj="flyoutState">
            {isCreateDataStreamFlyoutOpen ? 'open' : 'closed'}
          </span>
          <button data-test-subj="openButton" onClick={openCreateDataStreamFlyout}>
            Open
          </button>
          <button data-test-subj="closeButton" onClick={closeCreateDataStreamFlyout}>
            Close
          </button>
        </div>
      );
    };

    it('should work correctly in a component tree', () => {
      const { getByTestId } = render(
        <UIStateProvider>
          <TestComponent />
        </UIStateProvider>
      );

      expect(getByTestId('flyoutState')).toHaveTextContent('closed');

      fireEvent.click(getByTestId('openButton'));
      expect(getByTestId('flyoutState')).toHaveTextContent('open');

      fireEvent.click(getByTestId('closeButton'));
      expect(getByTestId('flyoutState')).toHaveTextContent('closed');
    });
  });
});
