/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamsSettingsFlyout } from './streams_settings_flyout';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_streams_privileges');
jest.mock('@kbn/react-hooks', () => ({
  useAbortController: () => ({ signal: new AbortController().signal }),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseStreamsPrivileges = useStreamsPrivileges as jest.MockedFunction<
  typeof useStreamsPrivileges
>;

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamsSettingsFlyout', () => {
  const mockEnableWiredMode = jest.fn();
  const mockDisableWiredMode = jest.fn();
  const mockOnClose = jest.fn();
  const mockRefreshStreams = jest.fn();
  const mockOnRefreshStatus = jest.fn();
  const mockAddError = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockTrackWiredStreamsStatusChanged = jest.fn();

  const defaultKibanaMock = {
    dependencies: {
      start: {
        streams: {
          enableWiredMode: mockEnableWiredMode,
          disableWiredMode: mockDisableWiredMode,
        },
      },
    },
    core: {
      notifications: {
        toasts: {
          addError: mockAddError,
          addSuccess: mockAddSuccess,
        },
      },
      uiSettings: {
        get: jest.fn(),
        set: jest.fn(),
        isOverridden: jest.fn().mockReturnValue(false),
      },
      docLinks: {
        links: {
          observability: {
            wiredStreams: 'https://example.com/docs',
          },
        },
      },
    },
    services: {
      telemetryClient: {
        trackWiredStreamsStatusChanged: mockTrackWiredStreamsStatusChanged,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStreamsPrivileges.mockReturnValue({
      ui: { manage: true },
      features: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseKibana.mockReturnValue(defaultKibanaMock as any);

    // Default mock implementations
    mockOnRefreshStatus.mockResolvedValue(undefined);
    mockEnableWiredMode.mockResolvedValue({});
    mockDisableWiredMode.mockResolvedValue({});
  });

  describe('Initial State', () => {
    it('should display switch as checked when both new streams are enabled', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
    });

    it('should display switch as unchecked when new streams are disabled', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': false,
        'logs.ecs': false,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
    });

    it('should display switch as unchecked when only one new stream is enabled', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': false,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
    });

    it('should display switch as unchecked when there is a conflict', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': 'conflict' as const,
        'logs.ecs': true,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
    });
  });

  describe('Enabling Wired Streams', () => {
    it('should enable wired mode when switch is clicked from disabled state', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': false,
        'logs.ecs': false,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
      });

      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      await waitFor(() => {
        expect(mockEnableWiredMode).toHaveBeenCalled();
        expect(mockOnRefreshStatus).toHaveBeenCalled();
        expect(mockTrackWiredStreamsStatusChanged).toHaveBeenCalledWith({ is_enabled: true });
        expect(mockRefreshStreams).toHaveBeenCalled();
        expect(mockAddSuccess).toHaveBeenCalledWith({
          title: 'Wired streams have been enabled successfully',
        });
      });
    });

    it('should show error toast if enabling fails', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': false,
        'logs.ecs': false,
        can_manage: true,
      };

      mockEnableWiredMode.mockRejectedValue(new Error('Enable failed'));

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
      });

      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            title: 'Error updating wired streams setting',
          })
        );
        expect(mockOnClose).not.toHaveBeenCalled(); // Should NOT close on error
      });
    });
  });

  describe('Disabling Wired Streams - Confirmation Modal', () => {
    it('should show confirmation modal when trying to disable wired streams', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Click to disable (should show modal)
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByText('Disable Wired Streams?')).toBeInTheDocument();
      });

      // Should NOT have called disable yet
      expect(mockDisableWiredMode).not.toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      await waitFor(() => {
        expect(screen.getByText('Disable Wired Streams?')).toBeInTheDocument();
      });

      // Click cancel
      await userEvent.click(screen.getByText('Cancel'));

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText('Disable Wired Streams?')).not.toBeInTheDocument();
      });

      // Should NOT have disabled
      expect(mockDisableWiredMode).not.toHaveBeenCalled();
    });

    it('should keep confirm button disabled until checkbox is checked', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Confirm button should be disabled
      const confirmButton = screen.getByRole('button', { name: /disable/i });
      expect(confirmButton).toBeDisabled();

      // Check the confirmation checkbox
      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      // Now confirm button should be enabled
      expect(confirmButton).not.toBeDisabled();
    });

    it('should disable wired streams when confirmed', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Check confirmation
      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /disable/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDisableWiredMode).toHaveBeenCalled();
        expect(mockOnRefreshStatus).toHaveBeenCalled();
        expect(mockTrackWiredStreamsStatusChanged).toHaveBeenCalledWith({ is_enabled: false });
        expect(mockRefreshStreams).toHaveBeenCalled();
      });

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText('Disable Wired Streams?')).not.toBeInTheDocument();
      });
    });

    it('should show error toast if disabling fails', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: true,
      };

      mockDisableWiredMode.mockRejectedValue(new Error('Disable failed'));

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Check and confirm
      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);
      const confirmButton = screen.getByRole('button', { name: /disable/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            title: 'Error updating wired streams setting',
          })
        );
      });
    });
  });

  describe('Permissions', () => {
    it('should disable switch when user lacks manage permissions', async () => {
      mockUseStreamsPrivileges.mockReturnValue({
        ui: { manage: false },
        features: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: true,
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).toBeDisabled();
    });

    it('should disable switch when Elasticsearch permissions are insufficient', async () => {
      const streamsStatus = {
        logs: false,
        'logs.otel': true,
        'logs.ecs': true,
        can_manage: false, // No ES permissions
      };

      renderWithProviders(
        <StreamsSettingsFlyout
          onClose={mockOnClose}
          refreshStreams={mockRefreshStreams}
          streamsStatus={streamsStatus}
          onRefreshStatus={mockOnRefreshStatus}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).toBeDisabled();
    });
  });
});
