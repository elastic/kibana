/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Settings } from './settings';
import { createMockWiredStreamDefinition } from '../../shared/mocks';
import type { StreamsAppKibanaContext } from '../../../../hooks/use_kibana';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_stream_detail');
jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: jest.fn(),
}));

import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamDetail } from '../../../../hooks/use_stream_detail';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseStreamDetail = useStreamDetail as jest.MockedFunction<typeof useStreamDetail>;
const mockUseUnsavedChangesPrompt = useUnsavedChangesPrompt as jest.MockedFunction<
  typeof useUnsavedChangesPrompt
>;

const mockRefreshDefinition = jest.fn();

describe('Settings', () => {
  const mockOpenConfirm = jest.fn();
  const mockHistory: StreamsAppKibanaContext['appParams']['history'] = {
    push: jest.fn(),
    replace: jest.fn(),
    location: { pathname: '/streams/logs.test', search: '', state: undefined, hash: '' },
  } as unknown as StreamsAppKibanaContext['appParams']['history'];
  const mockNavigateToUrl = jest.fn();

  const defaultDefinition = createMockWiredStreamDefinition({
    stream: {
      name: 'logs.test',
      description: '',
      updated_at: '2024-01-01T00:00:00.000Z',
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
        settings: {},
        failure_store: { inherit: {} },
        wired: {
          fields: {},
          routing: [],
        },
      },
    },
    effective_settings: {
      'index.number_of_shards': { value: 1, from: 'logs' },
      'index.number_of_replicas': { value: 1, from: 'logs' },
      'index.refresh_interval': { value: '1s', from: 'logs' },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const kibanaContext: StreamsAppKibanaContext = {
      appParams: {
        history: mockHistory,
      } as unknown as StreamsAppKibanaContext['appParams'],
      core: {
        http: {
          basePath: {
            get: jest.fn(),
            prepend: jest.fn(),
            remove: jest.fn(),
          },
        } as unknown as StreamsAppKibanaContext['core']['http'],
        application: {
          navigateToUrl: mockNavigateToUrl,
        } as unknown as StreamsAppKibanaContext['core']['application'],
        overlays: {
          openConfirm: mockOpenConfirm,
        } as unknown as StreamsAppKibanaContext['core']['overlays'],
        notifications: {
          toasts: {
            addError: jest.fn(),
            addSuccess: jest.fn(),
          },
        } as unknown as StreamsAppKibanaContext['core']['notifications'],
      } as unknown as StreamsAppKibanaContext['core'],
      dependencies: {
        start: {
          streams: {
            streamsRepositoryClient: {
              fetch: jest.fn().mockResolvedValue({}),
            },
          },
        } as unknown as StreamsAppKibanaContext['dependencies']['start'],
      },
      services: {
        dataStreamsClient: Promise.resolve(
          {} as unknown as StreamsAppKibanaContext['services']['dataStreamsClient'] extends Promise<
            infer T
          >
            ? T
            : never
        ),
        telemetryClient: {
          trackSchemaUpdated: jest.fn(),
        } as unknown as StreamsAppKibanaContext['services']['telemetryClient'],
        version: 'test-version',
      },
      isServerless: false,
    };

    mockUseKibana.mockReturnValue(kibanaContext);

    mockUseStreamDetail.mockReturnValue({
      definition: defaultDefinition,
      loading: false,
      refresh: mockRefreshDefinition,
    });

    mockUseUnsavedChangesPrompt.mockImplementation(() => {});
  });

  describe('Unsaved changes prompt', () => {
    it('calls useUnsavedChangesPrompt with hasUnsavedChanges=true when there are changes', async () => {
      renderWithI18n(
        <Settings definition={defaultDefinition} refreshDefinition={mockRefreshDefinition} />
      );

      // Initially, hasUnsavedChanges should be false
      expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
        expect.objectContaining({
          hasUnsavedChanges: false,
        })
      );

      // Make a change
      fireEvent.change(screen.getByTestId('streamsAppSettingsInput-Shards'), {
        target: { value: '2' },
      });

      // After change, hasUnsavedChanges should be true
      await waitFor(() => {
        expect(mockUseUnsavedChangesPrompt).toHaveBeenLastCalledWith(
          expect.objectContaining({
            hasUnsavedChanges: true,
          })
        );
      });
    });
  });

  describe('Bottom bar visibility', () => {
    it('shows bottom bar when user introduces changes', () => {
      renderWithI18n(
        <Settings definition={defaultDefinition} refreshDefinition={mockRefreshDefinition} />
      );

      // Bottom bar should not be visible initially
      expect(screen.queryByTestId('streamsAppSettingsBottomBar')).not.toBeInTheDocument();

      // Make a change
      fireEvent.change(screen.getByTestId('streamsAppSettingsInput-Shards'), {
        target: { value: '2' },
      });

      // Bottom bar should appear
      expect(screen.getByTestId('streamsAppSettingsBottomBar')).toBeInTheDocument();
    });

    it('hides bottom bar when changes are cancelled', async () => {
      renderWithI18n(
        <Settings definition={defaultDefinition} refreshDefinition={mockRefreshDefinition} />
      );

      // Make a change
      fireEvent.change(screen.getByTestId('streamsAppSettingsInput-Shards'), {
        target: { value: '2' },
      });

      // Bottom bar should be visible
      await waitFor(() => {
        expect(screen.getByTestId('streamsAppSettingsBottomBar')).toBeInTheDocument();
      });

      // Click cancel button
      fireEvent.click(screen.getByTestId('streamsAppSettingsCancelButton'));

      // Bottom bar should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('streamsAppSettingsBottomBar')).not.toBeInTheDocument();
      });
    });

    it('hides bottom bar when changes are reverted', async () => {
      renderWithI18n(
        <Settings definition={defaultDefinition} refreshDefinition={mockRefreshDefinition} />
      );

      // Make a change
      fireEvent.change(screen.getByTestId('streamsAppSettingsInput-Shards'), {
        target: { value: '2' },
      });

      // Bottom bar should be visible
      await waitFor(() => {
        expect(screen.getByTestId('streamsAppSettingsBottomBar')).toBeInTheDocument();
      });

      // Revert change by typing original value
      fireEvent.change(screen.getByTestId('streamsAppSettingsInput-Shards'), {
        target: { value: '1' },
      });

      // Bottom bar should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('streamsAppSettingsBottomBar')).not.toBeInTheDocument();
      });
    });
  });
});
