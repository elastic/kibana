/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useFailureStoreModal } from './use_failure_store_modal';

jest.mock('./use_dataset_quality_details_state', () => ({
  useDatasetQualityDetailsState: jest.fn(),
}));

jest.mock('@kbn/failure-store-modal', () => ({
  FailureStoreModal: jest.fn(),
}));

import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import { FailureStoreModal } from '@kbn/failure-store-modal';

describe('useFailureStoreModal', () => {
  const mockUseDatasetQualityDetailsState = useDatasetQualityDetailsState as jest.Mock;
  const mockFailureStoreModal = FailureStoreModal as jest.Mock;
  const mockUpdateFailureStore = jest.fn();

  const defaultMockData = {
    canUserReadFailureStore: true,
    hasFailureStore: true,
    defaultRetentionPeriod: '7d',
    customRetentionPeriod: '30d',
    updateFailureStore: mockUpdateFailureStore,
    canUserManageFailureStore: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDatasetQualityDetailsState.mockReturnValue(defaultMockData);
    mockFailureStoreModal.mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'failure-store-modal' })
    );
  });

  describe('initialization', () => {
    it('should initialize with modal closed', () => {
      const { result } = renderHook(() => useFailureStoreModal());

      expect(result.current.isFailureStoreModalOpen).toBe(false);
    });

    it('should return all values from useDatasetQualityDetailsState', () => {
      const { result } = renderHook(() => useFailureStoreModal());

      expect(result.current.canUserReadFailureStore).toBe(true);
      expect(result.current.canUserManageFailureStore).toBe(true);
      expect(result.current.hasFailureStore).toBe(true);
      expect(result.current.defaultRetentionPeriod).toBe('7d');
      expect(result.current.customRetentionPeriod).toBe('30d');
    });
  });

  describe('modal state management', () => {
    it('should open modal when openModal is called', () => {
      const { result } = renderHook(() => useFailureStoreModal());

      expect(result.current.isFailureStoreModalOpen).toBe(false);

      act(() => {
        result.current.openModal();
      });

      expect(result.current.isFailureStoreModalOpen).toBe(true);
    });

    it('should close modal when closeModal is called', () => {
      const { result } = renderHook(() => useFailureStoreModal());

      // First open the modal
      act(() => {
        result.current.openModal();
      });
      expect(result.current.isFailureStoreModalOpen).toBe(true);

      // Then close it
      act(() => {
        result.current.closeModal();
      });
      expect(result.current.isFailureStoreModalOpen).toBe(false);
    });
  });

  describe('handleSaveModal', () => {
    it('should call updateFailureStore with correct data and close modal', async () => {
      const { result } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });
      expect(result.current.isFailureStoreModalOpen).toBe(true);

      const saveData = {
        failureStoreEnabled: true,
        customRetentionPeriod: '15d',
      };

      await act(async () => {
        await result.current.handleSaveModal(saveData);
      });

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        failureStoreEnabled: true,
        customRetentionPeriod: '15d',
      });
      expect(result.current.isFailureStoreModalOpen).toBe(false);
    });

    it('should handle save with only failureStoreEnabled', async () => {
      const { result } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });

      const saveData = {
        failureStoreEnabled: false,
      };

      await act(async () => {
        await result.current.handleSaveModal(saveData);
      });

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        failureStoreEnabled: false,
        customRetentionPeriod: undefined,
      });
      expect(result.current.isFailureStoreModalOpen).toBe(false);
    });

    it('should handle save with undefined customRetentionPeriod', async () => {
      const { result } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });

      const saveData = {
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
      };

      await act(async () => {
        await result.current.handleSaveModal(saveData);
      });

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
      });
      expect(result.current.isFailureStoreModalOpen).toBe(false);
    });

    it('should close modal when updateFailureStore is called', async () => {
      const { result } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });

      const saveData = {
        failureStoreEnabled: true,
        customRetentionPeriod: '10d',
      };

      await act(async () => {
        await result.current.handleSaveModal(saveData);
      });

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        failureStoreEnabled: true,
        customRetentionPeriod: '10d',
      });
      expect(result.current.isFailureStoreModalOpen).toBe(false);
    });
  });

  describe('renderModal', () => {
    it('should return FailureStoreModal when user can manage and modal is open', () => {
      const { result } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });

      const modalElement = result.current.renderModal();

      expect(modalElement).not.toBeNull();
      expect(React.isValidElement(modalElement)).toBe(true);
      expect(modalElement?.props).toEqual({
        onCloseModal: result.current.closeModal,
        onSaveModal: result.current.handleSaveModal,
        failureStoreProps: {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '7d',
          customRetentionPeriod: '30d',
        },
      });
    });

    it('should return null when user cannot manage failure store', () => {
      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultMockData,
        canUserManageFailureStore: false,
      });

      const { result } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });

      const modalElement = result.current.renderModal();

      expect(modalElement).toBeNull();
      expect(mockFailureStoreModal).not.toHaveBeenCalled();
    });

    it('should return null when modal is not open', () => {
      const { result } = renderHook(() => useFailureStoreModal());

      const modalElement = result.current.renderModal();

      expect(modalElement).toBeNull();
      expect(mockFailureStoreModal).not.toHaveBeenCalled();
    });

    it('should pass correct props to FailureStoreModal', () => {
      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultMockData,
        hasFailureStore: false,
        defaultRetentionPeriod: '1d',
        customRetentionPeriod: '5d',
      });

      const { result } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });

      const modalElement = result.current.renderModal();

      expect(modalElement?.props).toEqual({
        onCloseModal: result.current.closeModal,
        onSaveModal: result.current.handleSaveModal,
        failureStoreProps: {
          failureStoreEnabled: false,
          defaultRetentionPeriod: '1d',
          customRetentionPeriod: '5d',
        },
      });
    });
  });

  describe('hook updates when dependencies change', () => {
    it('should reflect changes in useDatasetQualityDetailsState', () => {
      const { result, rerender } = renderHook(() => useFailureStoreModal());

      expect(result.current.hasFailureStore).toBe(true);
      expect(result.current.canUserReadFailureStore).toBe(true);

      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultMockData,
        hasFailureStore: false,
        canUserReadFailureStore: false,
      });

      rerender();

      expect(result.current.hasFailureStore).toBe(false);
      expect(result.current.canUserReadFailureStore).toBe(false);
    });

    it('should preserve modal state when dependencies change', () => {
      const { result, rerender } = renderHook(() => useFailureStoreModal());

      act(() => {
        result.current.openModal();
      });
      expect(result.current.isFailureStoreModalOpen).toBe(true);

      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultMockData,
        hasFailureStore: false,
      });

      rerender();

      expect(result.current.isFailureStoreModalOpen).toBe(true);
      expect(result.current.hasFailureStore).toBe(false);
    });
  });
});
