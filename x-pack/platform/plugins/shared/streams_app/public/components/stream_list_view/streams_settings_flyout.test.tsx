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
  const mockGetWiredStatus = jest.fn();
  const mockEnableWiredMode = jest.fn();
  const mockDisableWiredMode = jest.fn();
  const mockOnClose = jest.fn();
  const mockRefreshStreams = jest.fn();
  const mockAddError = jest.fn();
  const mockTrackWiredStreamsStatusChanged = jest.fn();
  const mockGetClassicStatus = jest.fn();

  const defaultKibanaMock = {
    dependencies: {
      start: {
        streams: {
          getWiredStatus: mockGetWiredStatus,
          getClassicStatus: mockGetClassicStatus,
          enableWiredMode: mockEnableWiredMode,
          disableWiredMode: mockDisableWiredMode,
        },
      },
    },
    core: {
      notifications: {
        toasts: {
          addError: mockAddError,
        },
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
  });

  describe('Initial Load', () => {
    it('should fetch wired status on mount', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(mockGetWiredStatus).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading spinner initially', () => {
      mockGetWiredStatus.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display switch as checked when wired streams is enabled', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
    });

    it('should display switch as unchecked when wired streams is disabled', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: false,
        can_manage: true,
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
    });

    it('should handle fetch errors gracefully', async () => {
      mockGetWiredStatus.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            title: 'Error fetching wired streams status',
          })
        );
      });
    });
  });

  describe('Enabling Wired Streams', () => {
    it('should enable wired mode when switch is clicked from disabled state', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: false,
        can_manage: true,
      });

      mockEnableWiredMode.mockResolvedValue({});

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
      });

      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      await waitFor(() => {
        expect(mockEnableWiredMode).toHaveBeenCalled();
        expect(mockGetWiredStatus).toHaveBeenCalledTimes(1); // Only on initial mount
        expect(mockTrackWiredStreamsStatusChanged).toHaveBeenCalledWith({ is_enabled: true });
        expect(mockRefreshStreams).toHaveBeenCalled();
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });
    });

    it('should show error toast if enabling fails', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: false,
        can_manage: true,
      });

      mockEnableWiredMode.mockRejectedValue(new Error('Enable failed'));

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
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
      });
    });
  });

  describe('Disabling Wired Streams - Confirmation Modal', () => {
    it('should show confirmation modal when trying to disable wired streams', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Click to disable (should show modal)
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Modal should be visible
      expect(screen.getByTestId('streamsWiredDisableModal')).toBeInTheDocument();
      expect(screen.getByText('Disable Wired Streams?')).toBeInTheDocument();

      // Should NOT have called disable yet
      expect(mockDisableWiredMode).not.toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));
      expect(screen.getByTestId('streamsWiredDisableModal')).toBeInTheDocument();

      // Click cancel
      await userEvent.click(screen.getByTestId('streamsWiredDisableCancelButton'));

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('streamsWiredDisableModal')).not.toBeInTheDocument();
      });

      // Should NOT have disabled
      expect(mockDisableWiredMode).not.toHaveBeenCalled();
    });

    it('should keep confirm button disabled until checkbox is checked', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Confirm button should be disabled
      const confirmButton = screen.getByTestId('streamsWiredDisableConfirmButton');
      expect(confirmButton).toBeDisabled();

      // Check the confirmation checkbox
      await userEvent.click(screen.getByTestId('streamsWiredDisableConfirmCheckbox'));

      // Now confirm button should be enabled
      expect(confirmButton).not.toBeDisabled();
    });

    it('should disable wired streams when confirmed', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      mockDisableWiredMode.mockResolvedValue({});

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Check confirmation
      await userEvent.click(screen.getByTestId('streamsWiredDisableConfirmCheckbox'));

      // Click confirm
      await userEvent.click(screen.getByTestId('streamsWiredDisableConfirmButton'));

      await waitFor(() => {
        expect(mockDisableWiredMode).toHaveBeenCalled();
        expect(mockGetWiredStatus).toHaveBeenCalledTimes(1); // Only on initial mount
        expect(mockTrackWiredStreamsStatusChanged).toHaveBeenCalledWith({ is_enabled: false });
        expect(mockRefreshStreams).toHaveBeenCalled();
        expect(screen.getByTestId('streamsWiredSwitch')).not.toBeChecked();
      });

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('streamsWiredDisableModal')).not.toBeInTheDocument();
      });
    });

    it('should show error toast if disabling fails', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      mockDisableWiredMode.mockRejectedValue(new Error('Disable failed'));

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeChecked();
      });

      // Open modal
      await userEvent.click(screen.getByTestId('streamsWiredSwitch'));

      // Check and confirm
      await userEvent.click(screen.getByTestId('streamsWiredDisableConfirmCheckbox'));
      await userEvent.click(screen.getByTestId('streamsWiredDisableConfirmButton'));

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

      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).toBeDisabled();
    });

    it('should disable switch when Elasticsearch permissions are insufficient', async () => {
      mockGetWiredStatus.mockResolvedValue({
        enabled: true,
        can_manage: false, // No ES permissions
      });

      renderWithProviders(
        <StreamsSettingsFlyout onClose={mockOnClose} refreshStreams={mockRefreshStreams} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('streamsWiredSwitch')).toBeInTheDocument();
      });

      expect(screen.getByTestId('streamsWiredSwitch')).toBeDisabled();
    });
  });
});
