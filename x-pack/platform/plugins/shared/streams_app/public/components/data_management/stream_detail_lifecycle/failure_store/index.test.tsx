/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Streams } from '@kbn/streams-schema';
import { StreamDetailFailureStore } from './index';

// Mock the dependencies
jest.mock('../../../../hooks/use_update_failure_store');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../hooks/use_failure_store_stats');
jest.mock('./no_failure_store_panel');
jest.mock('./failure_store_info');
jest.mock('./no_permission_banner');
jest.mock('@kbn/failure-store-modal', () => ({
  FailureStoreModal: ({ onCloseModal, onSaveModal, failureStoreProps }: any) => (
    <div data-test-subj="failure-store-modal">
      <div>Failure Store Modal</div>
      <div>Enabled: {failureStoreProps.failureStoreEnabled.toString()}</div>
      <div>Default Retention: {failureStoreProps.defaultRetentionPeriod}</div>
      <button onClick={() => onSaveModal({ failureStoreEnabled: true, customRetentionPeriod: '7d' })}>
        Save
      </button>
      <button onClick={onCloseModal}>Close</button>
    </div>
  ),
}));

import { useUpdateFailureStore } from '../../../../hooks/use_update_failure_store';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFailureStoreStats } from '../hooks/use_failure_store_stats';
import { NoFailureStorePanel } from './no_failure_store_panel';
import { FailureStoreInfo } from './failure_store_info';
import { NoPermissionBanner } from './no_permission_banner';

const mockUseUpdateFailureStore = useUpdateFailureStore as jest.MockedFunction<typeof useUpdateFailureStore>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseFailureStoreStats = useFailureStoreStats as jest.MockedFunction<typeof useFailureStoreStats>;
const mockNoFailureStorePanel = NoFailureStorePanel as jest.MockedFunction<typeof NoFailureStorePanel>;
const mockFailureStoreInfo = FailureStoreInfo as jest.MockedFunction<typeof FailureStoreInfo>;
const mockNoPermissionBanner = NoPermissionBanner as jest.MockedFunction<typeof NoPermissionBanner>;

describe('StreamDetailFailureStore', () => {
  const mockUpdateFailureStore = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();
  const mockRefresh = jest.fn();

  const createMockDefinition = (privileges: any = {
    read_failure_store: true,
    manage_failure_store: true,
  }): Streams.ingest.all.GetResponse => ({
    stream: { name: 'logs-test' },
    privileges,
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUpdateFailureStore.mockReturnValue({
      updateFailureStore: mockUpdateFailureStore,
    });

    mockUseKibana.mockReturnValue({
      core: {
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addDanger: mockAddDanger,
          },
        },
      },
    } as any);

    mockUseFailureStoreStats.mockReturnValue({
      data: {
        config: {
          enabled: true,
          retentionPeriod: {
            default: '30d',
            custom: '7d',
          },
        },
        stats: {
          totalDocs: 1000,
          sizeBytes: 5000000,
        },
      },
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    // Mock the child components
    mockNoFailureStorePanel.mockImplementation(({ openModal, definition }) => (
      <div data-test-subj="no-failure-store-panel">
        <button onClick={() => openModal(true)}>Enable Failure Store</button>
      </div>
    ));

    mockFailureStoreInfo.mockImplementation(({ openModal, definition }) => (
      <div data-test-subj="failure-store-info">
        <button onClick={() => openModal(true)}>Configure Failure Store</button>
      </div>
    ));

    mockNoPermissionBanner.mockImplementation(() => (
      <div data-test-subj="no-permission-banner">No Permission Banner</div>
    ));
  });

  describe('Permissions', () => {
    it('should show permission banner when read_failure_store privilege is false', () => {
      const definition = createMockDefinition({
        read_failure_store: false,
        manage_failure_store: false,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('no-permission-banner')).toBeInTheDocument();
    });

    it('should show content when read_failure_store privilege is true', () => {
      const definition = createMockDefinition();

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.queryByTestId('no-permission-banner')).not.toBeInTheDocument();
    });
  });

  describe('Failure Store Configuration States', () => {
    it('should show NoFailureStorePanel when failure store is not enabled', () => {
      mockUseFailureStoreStats.mockReturnValue({
        data: {
          config: { enabled: false },
          stats: null,
        },
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });

      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('no-failure-store-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('failure-store-info')).not.toBeInTheDocument();
    });

    it('should show FailureStoreInfo when failure store is enabled', () => {
      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('failure-store-info')).toBeInTheDocument();
      expect(screen.queryByTestId('no-failure-store-panel')).not.toBeInTheDocument();
    });

    it('should show FailureStoreInfo when loading stats', () => {
      mockUseFailureStoreStats.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refresh: mockRefresh,
      });

      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('failure-store-info')).toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('should open modal when triggered from child components', async () => {
      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      const configButton = screen.getByText('Configure Failure Store');
      await userEvent.click(configButton);

      expect(screen.getByTestId('failure-store-modal')).toBeInTheDocument();
      expect(screen.getByText('Failure Store Modal')).toBeInTheDocument();
    });

    it('should not open modal when manage_failure_store privilege is false', async () => {
      const definition = createMockDefinition({
        read_failure_store: true,
        manage_failure_store: false,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      const configButton = screen.getByText('Configure Failure Store');
      await userEvent.click(configButton);

      expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
    });

    it('should display correct props in modal', async () => {
      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      const configButton = screen.getByText('Configure Failure Store');
      await userEvent.click(configButton);

      expect(screen.getByText('Enabled: true')).toBeInTheDocument();
      expect(screen.getByText('Default Retention: 30d')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      const configButton = screen.getByText('Configure Failure Store');
      await userEvent.click(configButton);

      expect(screen.getByTestId('failure-store-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);

      expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should call updateFailureStore and show success toast on successful save', async () => {
      mockUpdateFailureStore.mockResolvedValue(undefined);
      
      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      const configButton = screen.getByText('Configure Failure Store');
      await userEvent.click(configButton);

      const saveButton = screen.getByText('Save');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateFailureStore).toHaveBeenCalledWith('logs-test', {
          failureStoreEnabled: true,
          customRetentionPeriod: '7d',
        });
      });

      expect(mockAddSuccess).toHaveBeenCalledWith({
        title: 'Failure store settings saved',
      });

      expect(mockRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
    });

    it('should show error toast on failed save', async () => {
      const error = new Error('Update failed');
      mockUpdateFailureStore.mockRejectedValue(error);
      
      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      const configButton = screen.getByText('Configure Failure Store');
      await userEvent.click(configButton);

      const saveButton = screen.getByText('Save');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAddDanger).toHaveBeenCalledWith({
          title: "We couldn't update the failure store settings.",
          text: 'Update failed',
        });
      });

      expect(mockRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    it('should pass correct props to FailureStoreInfo', () => {
      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      expect(mockFailureStoreInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          openModal: expect.any(Function),
          definition,
          statsError: null,
          isLoadingStats: false,
          stats: expect.any(Object),
          config: expect.any(Object),
        }),
        {}
      );
    });

    it('should pass correct props to NoFailureStorePanel', () => {
      mockUseFailureStoreStats.mockReturnValue({
        data: {
          config: { enabled: false },
          stats: null,
        },
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });

      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      expect(mockNoFailureStorePanel).toHaveBeenCalledWith(
        expect.objectContaining({
          openModal: expect.any(Function),
          definition,
        }),
        {}
      );
    });
  });

  describe('Error Handling', () => {
    it('should pass stats error to child components', () => {
      const statsError = new Error('Stats fetch failed');
      mockUseFailureStoreStats.mockReturnValue({
        data: {
          config: { enabled: true },
          stats: null,
        },
        isLoading: false,
        error: statsError,
        refresh: mockRefresh,
      });

      const definition = createMockDefinition();
      render(<StreamDetailFailureStore definition={definition} />);

      expect(mockFailureStoreInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          statsError,
        }),
        {}
      );
    });
  });
});