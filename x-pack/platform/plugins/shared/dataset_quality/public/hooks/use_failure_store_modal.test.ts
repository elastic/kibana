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

jest.mock('@kbn/streams-schema', () => ({
  isRootStreamDefinition: jest.fn(),
  isEnabledFailureStore: jest.fn(),
  isInheritFailureStore: jest.fn(),
  isDisabledLifecycleFailureStore: jest.fn(),
  isEnabledLifecycleFailureStore: jest.fn(),
}));

import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import { FailureStoreModal } from '@kbn/failure-store-modal';
import {
  isRootStreamDefinition,
  isEnabledFailureStore,
  isInheritFailureStore,
  isDisabledLifecycleFailureStore,
  isEnabledLifecycleFailureStore,
} from '@kbn/streams-schema';

describe('useFailureStoreModal', () => {
  const mockUseDatasetQualityDetailsState = useDatasetQualityDetailsState as jest.Mock;
  const mockFailureStoreModal = FailureStoreModal as jest.Mock;
  const mockUpdateFailureStore = jest.fn();
  const mockIsRootStreamDefinition = isRootStreamDefinition as unknown as jest.Mock;
  const mockIsEnabledFailureStore = isEnabledFailureStore as unknown as jest.Mock;
  const mockIsInheritFailureStore = isInheritFailureStore as unknown as jest.Mock;
  const mockIsDisabledLifecycleFailureStore =
    isDisabledLifecycleFailureStore as unknown as jest.Mock;
  const mockIsEnabledLifecycleFailureStore = isEnabledLifecycleFailureStore as unknown as jest.Mock;

  const defaultMockData = {
    canUserReadFailureStore: true,
    hasFailureStore: true,
    defaultRetentionPeriod: '7d',
    customRetentionPeriod: '30d',
    updateFailureStore: mockUpdateFailureStore,
    canUserManageFailureStore: true,
    view: 'dataQuality' as const,
    streamDefinition: undefined,
    dataStreamDetails: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDatasetQualityDetailsState.mockReturnValue(defaultMockData);
    mockFailureStoreModal.mockImplementation(() =>
      React.createElement('div', { 'data-testid': 'failure-store-modal' })
    );
    // Default mock implementations
    mockIsRootStreamDefinition.mockReturnValue(false);
    mockIsEnabledFailureStore.mockReturnValue(true);
    mockIsInheritFailureStore.mockReturnValue(false);
    mockIsDisabledLifecycleFailureStore.mockReturnValue(false);
    mockIsEnabledLifecycleFailureStore.mockReturnValue(true);
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
    describe('dataQuality view', () => {
      beforeEach(() => {
        mockUseDatasetQualityDetailsState.mockReturnValue({
          ...defaultMockData,
          view: 'dataQuality',
        });
      });

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
          failureStoreDataQualityConfig: {
            failureStoreEnabled: true,
            customRetentionPeriod: '15d',
          },
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
          failureStoreDataQualityConfig: {
            failureStoreEnabled: false,
            customRetentionPeriod: undefined,
          },
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
          failureStoreDataQualityConfig: {
            failureStoreEnabled: true,
            customRetentionPeriod: undefined,
          },
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
          failureStoreDataQualityConfig: {
            failureStoreEnabled: true,
            customRetentionPeriod: '10d',
          },
        });
        expect(result.current.isFailureStoreModalOpen).toBe(false);
      });
    });

    describe('stream views (classic/wired)', () => {
      const mockStreamDefinition = {
        stream: {
          name: 'test-stream',
          ingest: {
            failure_store: {
              lifecycle: {
                enabled: {
                  data_retention: '7d',
                },
              },
            },
          },
        },
      };

      beforeEach(() => {
        mockUseDatasetQualityDetailsState.mockReturnValue({
          ...defaultMockData,
          view: 'classic',
          streamDefinition: mockStreamDefinition,
        });
      });

      it('should handle inherit option when enabled', async () => {
        const { result } = renderHook(() => useFailureStoreModal());

        act(() => {
          result.current.openModal();
        });

        const saveData = {
          failureStoreEnabled: true,
          inherit: true,
        };

        await act(async () => {
          await result.current.handleSaveModal(saveData);
        });

        expect(mockUpdateFailureStore).toHaveBeenCalledWith({
          failureStoreStreamConfig: { inherit: {} },
        });
        expect(result.current.isFailureStoreModalOpen).toBe(false);
      });

      it('should handle disabled failure store', async () => {
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
          failureStoreStreamConfig: { disabled: {} },
        });
        expect(result.current.isFailureStoreModalOpen).toBe(false);
      });

      it('should handle retention disabled', async () => {
        const { result } = renderHook(() => useFailureStoreModal());

        act(() => {
          result.current.openModal();
        });

        const saveData = {
          failureStoreEnabled: true,
          retentionDisabled: true,
        };

        await act(async () => {
          await result.current.handleSaveModal(saveData);
        });

        expect(mockUpdateFailureStore).toHaveBeenCalledWith({
          failureStoreStreamConfig: {
            lifecycle: { disabled: {} },
          },
        });
        expect(result.current.isFailureStoreModalOpen).toBe(false);
      });

      it('should handle custom retention period', async () => {
        const { result } = renderHook(() => useFailureStoreModal());

        act(() => {
          result.current.openModal();
        });

        const saveData = {
          failureStoreEnabled: true,
          customRetentionPeriod: '15d',
        };

        await act(async () => {
          await result.current.handleSaveModal(saveData);
        });

        expect(mockUpdateFailureStore).toHaveBeenCalledWith({
          failureStoreStreamConfig: {
            lifecycle: {
              enabled: {
                data_retention: '15d',
              },
            },
          },
        });
        expect(result.current.isFailureStoreModalOpen).toBe(false);
      });

      it('should handle enabled without custom retention', async () => {
        const { result } = renderHook(() => useFailureStoreModal());

        act(() => {
          result.current.openModal();
        });

        const saveData = {
          failureStoreEnabled: true,
        };

        await act(async () => {
          await result.current.handleSaveModal(saveData);
        });

        expect(mockUpdateFailureStore).toHaveBeenCalledWith({
          failureStoreStreamConfig: {
            lifecycle: {
              enabled: {
                data_retention: undefined,
              },
            },
          },
        });
        expect(result.current.isFailureStoreModalOpen).toBe(false);
      });
    });
  });

  describe('renderModal', () => {
    describe('common behavior', () => {
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
    });

    describe('dataQuality view', () => {
      beforeEach(() => {
        mockUseDatasetQualityDetailsState.mockReturnValue({
          ...defaultMockData,
          view: 'dataQuality',
        });
      });

      it('should return FailureStoreModal with correct props when modal is open', () => {
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

      it('should pass correct props to FailureStoreModal with different values', () => {
        mockUseDatasetQualityDetailsState.mockReturnValue({
          ...defaultMockData,
          view: 'dataQuality',
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

    describe('stream views (classic/wired)', () => {
      const mockStreamDefinition = {
        stream: {
          name: 'test-stream',
          ingest: {
            failure_store: {
              lifecycle: {
                enabled: {
                  data_retention: '14d',
                },
              },
            },
          },
        },
      };

      describe('classic view (non-root stream)', () => {
        beforeEach(() => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'classic',
            streamDefinition: mockStreamDefinition,
            dataStreamDetails: { isServerless: false },
          });
          mockIsRootStreamDefinition.mockReturnValue(false);
          mockIsEnabledFailureStore.mockReturnValue(true);
          mockIsInheritFailureStore.mockReturnValue(false);
          mockIsDisabledLifecycleFailureStore.mockReturnValue(false);
          mockIsEnabledLifecycleFailureStore.mockReturnValue(true);
        });

        it('should return FailureStoreModal with inherit options for non-root stream', () => {
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
              customRetentionPeriod: '14d',
              retentionDisabled: false,
            },
            inheritOptions: {
              canShowInherit: true,
              isWired: false,
              isCurrentlyInherited: false,
            },
            canShowDisableLifecycle: true,
            showIlmDescription: true,
            disableButtonLabel: 'Indefinite',
          });
        });

        it('should not show disable lifecycle option in serverless', () => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'classic',
            streamDefinition: mockStreamDefinition,
            dataStreamDetails: { isServerless: true },
          });

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
              customRetentionPeriod: '14d',
              retentionDisabled: false,
            },
            inheritOptions: {
              canShowInherit: true,
              isWired: false,
              isCurrentlyInherited: false,
            },
            canShowDisableLifecycle: false,
            showIlmDescription: false,
            disableButtonLabel: 'Indefinite',
          });
        });
      });

      describe('wired view (non-root stream)', () => {
        beforeEach(() => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'wired',
            streamDefinition: mockStreamDefinition,
            dataStreamDetails: { isServerless: false },
          });
          mockIsRootStreamDefinition.mockReturnValue(false);
          mockIsEnabledFailureStore.mockReturnValue(true);
          mockIsInheritFailureStore.mockReturnValue(false);
          mockIsDisabledLifecycleFailureStore.mockReturnValue(false);
          mockIsEnabledLifecycleFailureStore.mockReturnValue(true);
        });

        it('should return FailureStoreModal with wired inherit options', () => {
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
              customRetentionPeriod: '14d',
              retentionDisabled: false,
            },
            inheritOptions: {
              canShowInherit: true,
              isWired: true,
              isCurrentlyInherited: false,
            },
            canShowDisableLifecycle: true,
            showIlmDescription: true,
            disableButtonLabel: 'Indefinite',
          });
        });

        it('should not show disable lifecycle option in serverless', () => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'wired',
            streamDefinition: mockStreamDefinition,
            dataStreamDetails: { isServerless: true },
          });

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
              customRetentionPeriod: '14d',
              retentionDisabled: false,
            },
            inheritOptions: {
              canShowInherit: true,
              isWired: true,
              isCurrentlyInherited: false,
            },
            canShowDisableLifecycle: false,
            showIlmDescription: false,
            disableButtonLabel: 'Indefinite',
          });
        });
      });

      describe('root stream', () => {
        const rootStreamDefinition = {
          stream: {
            name: 'logs',
            ingest: {
              wired: {},
              failure_store: {
                lifecycle: {
                  enabled: {
                    data_retention: '7d',
                  },
                },
              },
            },
          },
        };

        beforeEach(() => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'wired',
            streamDefinition: rootStreamDefinition,
            dataStreamDetails: { isServerless: false },
          });
          mockIsRootStreamDefinition.mockReturnValue(true);
          mockIsEnabledFailureStore.mockReturnValue(true);
          mockIsInheritFailureStore.mockReturnValue(false);
          mockIsDisabledLifecycleFailureStore.mockReturnValue(false);
          mockIsEnabledLifecycleFailureStore.mockReturnValue(true);
        });

        it('should not include inherit options for root stream', () => {
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
              customRetentionPeriod: '7d',
              retentionDisabled: false,
            },
            canShowDisableLifecycle: true,
            showIlmDescription: true,
            disableButtonLabel: 'Indefinite',
          });
        });

        it('should not show disable lifecycle option for root stream in serverless', () => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'wired',
            streamDefinition: rootStreamDefinition,
            dataStreamDetails: { isServerless: true },
          });

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
              customRetentionPeriod: '7d',
              retentionDisabled: false,
            },
            canShowDisableLifecycle: false,
            showIlmDescription: false,
            disableButtonLabel: 'Indefinite',
          });
        });
      });

      describe('inherited failure store', () => {
        const inheritedStreamDefinition = {
          stream: {
            name: 'test-stream',
            ingest: {
              failure_store: {
                inherit: {},
              },
            },
          },
        };

        beforeEach(() => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'classic',
            streamDefinition: inheritedStreamDefinition,
            dataStreamDetails: { isServerless: false },
          });
          mockIsRootStreamDefinition.mockReturnValue(false);
          mockIsEnabledFailureStore.mockReturnValue(false);
          mockIsInheritFailureStore.mockReturnValue(true);
          mockIsDisabledLifecycleFailureStore.mockReturnValue(false);
          mockIsEnabledLifecycleFailureStore.mockReturnValue(false);
        });

        it('should show inherited state in modal props', () => {
          const { result } = renderHook(() => useFailureStoreModal());

          act(() => {
            result.current.openModal();
          });

          const modalElement = result.current.renderModal();

          expect(modalElement).not.toBeNull();
          expect(modalElement?.props).toEqual({
            onCloseModal: result.current.closeModal,
            onSaveModal: result.current.handleSaveModal,
            failureStoreProps: {
              failureStoreEnabled: false,
              defaultRetentionPeriod: '7d',
              customRetentionPeriod: undefined,
              retentionDisabled: false,
            },
            inheritOptions: {
              canShowInherit: true,
              isWired: false,
              isCurrentlyInherited: true,
            },
            canShowDisableLifecycle: true,
            showIlmDescription: true,
            disableButtonLabel: 'Indefinite',
          });
        });
      });

      describe('disabled lifecycle failure store', () => {
        const disabledLifecycleStreamDefinition = {
          stream: {
            name: 'test-stream',
            ingest: {
              failure_store: {
                lifecycle: {
                  disabled: {},
                },
              },
            },
          },
        };

        beforeEach(() => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'classic',
            streamDefinition: disabledLifecycleStreamDefinition,
            dataStreamDetails: { isServerless: false },
          });
          mockIsRootStreamDefinition.mockReturnValue(false);
          mockIsEnabledFailureStore.mockReturnValue(true);
          mockIsInheritFailureStore.mockReturnValue(false);
          mockIsDisabledLifecycleFailureStore.mockReturnValue(true);
          mockIsEnabledLifecycleFailureStore.mockReturnValue(false);
        });

        it('should show retention disabled state in modal props', () => {
          const { result } = renderHook(() => useFailureStoreModal());

          act(() => {
            result.current.openModal();
          });

          const modalElement = result.current.renderModal();

          expect(modalElement).not.toBeNull();
          expect(modalElement?.props).toEqual({
            onCloseModal: result.current.closeModal,
            onSaveModal: result.current.handleSaveModal,
            failureStoreProps: {
              failureStoreEnabled: true,
              defaultRetentionPeriod: '7d',
              customRetentionPeriod: undefined,
              retentionDisabled: true,
            },
            inheritOptions: {
              canShowInherit: true,
              isWired: false,
              isCurrentlyInherited: false,
            },
            canShowDisableLifecycle: true,
            showIlmDescription: true,
            disableButtonLabel: 'Indefinite',
          });
        });
      });

      describe('disabled failure store', () => {
        const disabledStreamDefinition = {
          stream: {
            name: 'test-stream',
            ingest: {
              failure_store: {
                disabled: {},
              },
            },
          },
        };

        beforeEach(() => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'classic',
            streamDefinition: disabledStreamDefinition,
            dataStreamDetails: { isServerless: false },
          });
          mockIsRootStreamDefinition.mockReturnValue(false);
          mockIsEnabledFailureStore.mockReturnValue(false);
          mockIsInheritFailureStore.mockReturnValue(false);
          mockIsDisabledLifecycleFailureStore.mockReturnValue(false);
          mockIsEnabledLifecycleFailureStore.mockReturnValue(false);
        });

        it('should show disabled state in modal props', () => {
          const { result } = renderHook(() => useFailureStoreModal());

          act(() => {
            result.current.openModal();
          });

          const modalElement = result.current.renderModal();

          expect(modalElement).not.toBeNull();
          expect(modalElement?.props).toEqual({
            onCloseModal: result.current.closeModal,
            onSaveModal: result.current.handleSaveModal,
            failureStoreProps: {
              failureStoreEnabled: false,
              defaultRetentionPeriod: '7d',
              customRetentionPeriod: undefined,
              retentionDisabled: false,
            },
            inheritOptions: {
              canShowInherit: true,
              isWired: false,
              isCurrentlyInherited: false,
            },
            canShowDisableLifecycle: true,
            showIlmDescription: true,
            disableButtonLabel: 'Indefinite',
          });
        });
      });

      describe('null stream definition', () => {
        beforeEach(() => {
          mockUseDatasetQualityDetailsState.mockReturnValue({
            ...defaultMockData,
            view: 'classic',
            streamDefinition: undefined,
          });
        });

        it('should return null when stream definition is missing', () => {
          const { result } = renderHook(() => useFailureStoreModal());

          act(() => {
            result.current.openModal();
          });

          const modalElement = result.current.renderModal();

          expect(modalElement).toBeNull();
        });
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
