/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { MissingDataStreamCallout } from './missing_data_stream_callout';

const mockFetch = jest.fn();
const mockNavigateToApp = jest.fn();
const mockAddSuccess = jest.fn();
const mockOpenConfirm = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      application: { navigateToApp: mockNavigateToApp },
      notifications: { toasts: { addSuccess: mockAddSuccess } },
      overlays: { openConfirm: mockOpenConfirm },
    },
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: {
            fetch: mockFetch,
          },
        },
      },
    },
  }),
}));

describe('MissingDataStreamCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({});
    mockOpenConfirm.mockResolvedValue(true);
  });

  it('disables actions when user cannot manage', () => {
    render(
      <I18nProvider>
        <MissingDataStreamCallout
          streamName="logs-test"
          canManage={false}
          refreshDefinition={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('streamsMissingDataStreamRestoreButton')).toBeDisabled();
    expect(screen.getByTestId('streamsMissingDataStreamDeleteButton')).toBeDisabled();
  });

  it('restores stream by recreating the backing data stream and refreshing definition', async () => {
    const refreshDefinition = jest.fn();
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MissingDataStreamCallout
          streamName="logs-test"
          canManage={true}
          refreshDefinition={refreshDefinition}
        />
      </I18nProvider>
    );

    await user.click(screen.getByTestId('streamsMissingDataStreamRestoreButton'));

    expect(mockFetch).toHaveBeenCalledWith('POST /internal/streams/{name}/_restore_data_stream', {
      params: { path: { name: 'logs-test' } },
      signal: expect.anything(),
    });
    expect(mockAddSuccess).toHaveBeenCalled();
    expect(refreshDefinition).toHaveBeenCalled();
  });

  it('deletes stream definition after confirmation and navigates away', async () => {
    const refreshDefinition = jest.fn();
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MissingDataStreamCallout
          streamName="logs-test"
          canManage={true}
          refreshDefinition={refreshDefinition}
        />
      </I18nProvider>
    );

    await user.click(screen.getByTestId('streamsMissingDataStreamDeleteButton'));

    expect(mockOpenConfirm).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: 'logs-test' } },
      signal: expect.anything(),
    });
    expect(mockAddSuccess).toHaveBeenCalled();
    expect(mockNavigateToApp).toHaveBeenCalledWith('/streams');
  });

  it('does not delete if confirmation is cancelled', async () => {
    mockOpenConfirm.mockResolvedValue(false);

    const user = userEvent.setup();
    render(
      <I18nProvider>
        <MissingDataStreamCallout streamName="logs-test" canManage={true} refreshDefinition={jest.fn()} />
      </I18nProvider>
    );

    await user.click(screen.getByTestId('streamsMissingDataStreamDeleteButton'));

    expect(mockFetch).not.toHaveBeenCalledWith(
      'DELETE /api/streams/{name} 2023-10-31',
      expect.anything()
    );
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });
});

