/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamDetailFailureStore } from './index';
import type { Streams } from '@kbn/streams-schema';

// Mock the hooks
const mockUpdateFailureStore = jest.fn();
const mockRefresh = jest.fn();

jest.mock('../../../../hooks/use_update_failure_store', () => ({
  useUpdateFailureStore: () => ({
    updateFailureStore: mockUpdateFailureStore,
  }),
}));

const mockNotifications = {
  toasts: {
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
  },
};

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      notifications: mockNotifications,
    },
  }),
}));

jest.mock('../hooks/use_failure_store_stats', () => ({
  useFailureStoreStats: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: undefined,
    refresh: mockRefresh,
  })),
}));

// Mock the child components
jest.mock('./no_failure_store_panel', () => ({
  NoFailureStorePanel: jest.fn(({ openModal, definition }) => (
    <div data-testid="no-failure-store-panel">
      <span data-testid="definition-name">{definition.stream.name}</span>
      <button data-testid="open-modal-button" onClick={() => openModal(true)}>
        Configure Failure Store
      </button>
    </div>
  )),
}));

jest.mock('./failure_store_info', () => ({
  FailureStoreInfo: jest.fn(({ openModal, definition, stats, config, isLoadingStats, statsError }) => (
    <div data-testid="failure-store-info">
      <span data-testid="definition-name">{definition.stream.name}</span>
      <span data-testid="config-enabled">{config?.enabled?.toString() || 'undefined'}</span>
      <span data-testid="loading-stats">{isLoadingStats.toString()}</span>
      <span data-testid="stats-error">{statsError?.message || 'no-error'}</span>
      <button data-testid="open-modal-button" onClick={() => openModal(true)}>
        Edit Configuration
      </button>
    </div>
  )),
}));

jest.mock('./no_permission_banner', () => ({
  NoPermissionBanner: () => (
    <div data-testid="no-permission-banner">
      You don't have permission to view failure store settings
    </div>
  ),
}));

// Mock the lazy-loaded FailureStoreModal
jest.mock('@kbn/failure-store-modal', () => ({
  FailureStoreModal: jest.fn(({ onCloseModal, onSaveModal, failureStoreProps }) => (
    <div data-testid="failure-store-modal">
      <span data-testid="modal-enabled">{failureStoreProps.failureStoreEnabled.toString()}</span>
      <span data-testid="modal-default-retention">{failureStoreProps.defaultRetentionPeriod}</span>
      <span data-testid="modal-custom-retention">{failureStoreProps.customRetentionPeriod || 'undefined'}</span>
      <button data-testid="modal-close" onClick={onCloseModal}>
        Close
      </button>
      <button
        data-testid="modal-save"
        onClick={() => onSaveModal({ failureStoreEnabled: true, customRetentionPeriod: '7d' })}
      >
        Save
      </button>
    </div>
  )),
}));

describe('StreamDetailFailureStore', () => {
  const createMockDefinition = (privileges = {
    read_failure_store: true,
    manage_failure_store: true,
  }): Streams.ingest.all.GetResponse => ({
    stream: { name: 'test-stream' },
    privileges,
  } as unknown as Streams.ingest.all.GetResponse);

  const mockFailureStoreStats = {
    data: {
      config: {
        enabled: true,
        retentionPeriod: {
          default: '30d',
          custom: '7d',
        },
      },
      stats: {
        docsCount: 100,
        sizeBytes: 1024 * 1024,
      },
    },
    isLoading: false,
    error: undefined,
    refresh: mockRefresh,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Handling', () => {
    it('renders no permission banner when user lacks read_failure_store privilege', () => {
      const definition = createMockDefinition({
        read_failure_store: false,
        manage_failure_store: false,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('no-permission-banner')).toBeInTheDocument();
      expect(screen.queryByTestId('no-failure-store-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('failure-store-info')).not.toBeInTheDocument();
    });

    it('renders failure store content when user has read_failure_store privilege', () => {
      const definition = createMockDefinition({
        read_failure_store: true,
        manage_failure_store: false,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.queryByTestId('no-permission-banner')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-failure-store-panel')).toBeInTheDocument();
    });
  });

  describe('No Failure Store State', () => {
    it('renders no failure store panel when failure store is not configured', () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue({
        data: { config: { enabled: false } },
        isLoading: false,
        error: undefined,
        refresh: mockRefresh,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('no-failure-store-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('failure-store-info')).not.toBeInTheDocument();
    });

    it('passes correct props to no failure store panel', () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue({
        data: { config: { enabled: false } },
        isLoading: false,
        error: undefined,
        refresh: mockRefresh,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('definition-name')).toHaveTextContent('test-stream');
    });
  });

  describe('Failure Store Enabled State', () => {
    it('renders failure store info when failure store is enabled', () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('failure-store-info')).toBeInTheDocument();
      expect(screen.queryByTestId('no-failure-store-panel')).not.toBeInTheDocument();
    });

    it('passes correct props to failure store info', () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('definition-name')).toHaveTextContent('test-stream');
      expect(screen.getByTestId('config-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('loading-stats')).toHaveTextContent('false');
      expect(screen.getByTestId('stats-error')).toHaveTextContent('no-error');
    });

    it('renders failure store info when stats are loading', () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
        refresh: mockRefresh,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('failure-store-info')).toBeInTheDocument();
      expect(screen.getByTestId('loading-stats')).toHaveTextContent('true');
    });
  });

  describe('Modal Management', () => {
    it('opens modal when requested from no failure store panel', async () => {
      const definition = createMockDefinition({
        read_failure_store: true,
        manage_failure_store: true,
      });
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue({
        data: { config: { enabled: false, retentionPeriod: { default: '30d' } } },
        isLoading: false,
        error: undefined,
        refresh: mockRefresh,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      const openModalButton = screen.getByTestId('open-modal-button');
      await userEvent.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByTestId('failure-store-modal')).toBeInTheDocument();
      });
    });

    it('opens modal when requested from failure store info', async () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      const openModalButton = screen.getByTestId('open-modal-button');
      await userEvent.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByTestId('failure-store-modal')).toBeInTheDocument();
      });
    });

    it('does not render modal when user lacks manage_failure_store privilege', async () => {
      const definition = createMockDefinition({
        read_failure_store: true,
        manage_failure_store: false,
      });
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      const openModalButton = screen.getByTestId('open-modal-button');
      await userEvent.click(openModalButton);

      expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
    });

    it('passes correct props to modal', async () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      const openModalButton = screen.getByTestId('open-modal-button');
      await userEvent.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByTestId('modal-enabled')).toHaveTextContent('true');
        expect(screen.getByTestId('modal-default-retention')).toHaveTextContent('30d');
        expect(screen.getByTestId('modal-custom-retention')).toHaveTextContent('7d');
      });
    });
  });

  describe('Modal Actions', () => {
    it('closes modal when close is clicked', async () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      // Open modal
      const openModalButton = screen.getByTestId('open-modal-button');
      await userEvent.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByTestId('failure-store-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByTestId('modal-close');
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
      });
    });

    it('handles successful save operation', async () => {
      mockUpdateFailureStore.mockResolvedValueOnce(undefined);

      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      // Open modal
      const openModalButton = screen.getByTestId('open-modal-button');
      await userEvent.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByTestId('failure-store-modal')).toBeInTheDocument();
      });

      // Save changes
      const saveButton = screen.getByTestId('modal-save');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateFailureStore).toHaveBeenCalledWith('test-stream', {
          failureStoreEnabled: true,
          customRetentionPeriod: '7d',
        });
      });

      expect(mockNotifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Failure store settings saved',
      });
      expect(mockRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
    });

    it('handles failed save operation', async () => {
      const error = new Error('Update failed');
      mockUpdateFailureStore.mockRejectedValueOnce(error);

      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue(mockFailureStoreStats);

      render(<StreamDetailFailureStore definition={definition} />);

      // Open modal
      const openModalButton = screen.getByTestId('open-modal-button');
      await userEvent.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByTestId('failure-store-modal')).toBeInTheDocument();
      });

      // Save changes (which will fail)
      const saveButton = screen.getByTestId('modal-save');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNotifications.toasts.addDanger).toHaveBeenCalledWith({
          title: "We couldn't update the failure store settings.",
          text: 'Update failed',
        });
      });

      expect(mockRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('failure-store-modal')).not.toBeInTheDocument();
    });
  });

  describe('Error State Handling', () => {
    it('handles stats error gracefully', () => {
      const definition = createMockDefinition();
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch stats'),
        refresh: mockRefresh,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      // Should still render the no failure store panel when there's an error
      expect(screen.getByTestId('no-failure-store-panel')).toBeInTheDocument();
    });

    it('passes stats error to failure store info when config exists', () => {
      const definition = createMockDefinition();
      const statsError = new Error('Stats fetch failed');
      const mockUseFailureStoreStats = require('../hooks/use_failure_store_stats');
      mockUseFailureStoreStats.useFailureStoreStats.mockReturnValue({
        data: { config: { enabled: true } },
        isLoading: false,
        error: statsError,
        refresh: mockRefresh,
      });

      render(<StreamDetailFailureStore definition={definition} />);

      expect(screen.getByTestId('failure-store-info')).toBeInTheDocument();
      expect(screen.getByTestId('stats-error')).toHaveTextContent('Stats fetch failed');
    });
  });
});