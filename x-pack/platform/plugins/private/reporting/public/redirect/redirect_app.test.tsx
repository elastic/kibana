/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { RedirectApp } from './redirect_app';
import { EuiProvider } from '@elastic/eui';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { scopedHistoryMock } from '@kbn/core/public/mocks';
import { AI_VALUE_REPORT_LOCATOR } from '@kbn/deeplinks-analytics';

const mockApiClient = {
  getInfo: jest.fn(),
  getScheduledReportInfo: jest.fn(),
};
const mockScreenshotMode = {
  getScreenshotContext: jest.fn(),
};
const mockShare = sharePluginMock.createSetupContract();
const historyMock = scopedHistoryMock.create();
function setLocationSearch(search: string) {
  window.history.pushState({}, '', search);
}

describe('RedirectApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset the URL to the root after each test
    window.history.pushState({}, '', '/');
  });

  it('navigates using share.navigate when apiClient.getInfo returns locatorParams', async () => {
    setLocationSearch('?jobId=happy');
    const locatorParams = { id: 'LENS_APP_LOCATOR', params: { foo: 'bar' } };
    mockApiClient.getInfo.mockResolvedValue({ locatorParams: [locatorParams] });

    render(
      <EuiProvider>
        <RedirectApp
          apiClient={mockApiClient as any}
          screenshotMode={mockScreenshotMode as any}
          share={mockShare}
          history={historyMock}
        />
      </EuiProvider>
    );

    await waitFor(() => {
      expect(mockApiClient.getInfo).toHaveBeenCalledWith('happy');
      expect(mockShare.navigate).toHaveBeenCalledWith(locatorParams);
    });
  });

  it('navigates using share.navigate when apiClient.getScheduledReportInfo returns locatorParams', async () => {
    setLocationSearch('?page=2&perPage=50&scheduledReportId=happy');
    const locatorParams = { id: 'LENS_APP_LOCATOR', params: { foo: 'bar' } };
    mockApiClient.getScheduledReportInfo.mockResolvedValue({
      payload: { locatorParams: [locatorParams] },
    });

    render(
      <EuiProvider>
        <RedirectApp
          apiClient={mockApiClient as any}
          screenshotMode={mockScreenshotMode as any}
          share={mockShare}
          history={historyMock}
        />
      </EuiProvider>
    );

    await waitFor(() => {
      expect(mockApiClient.getScheduledReportInfo).toHaveBeenCalledWith('happy', 2, 50);
      expect(mockShare.navigate).toHaveBeenCalledWith(locatorParams);
    });
  });

  it('strips export-only ai value report params when redirecting from jobId', async () => {
    setLocationSearch('?jobId=happy');
    const locatorParams = {
      id: AI_VALUE_REPORT_LOCATOR,
      params: {
        timeRange: { from: 'now-30d', to: 'now' },
        insight: 'This should not be forwarded to the in-app view',
        reportDataHash: 'abc123',
      },
    };
    mockApiClient.getInfo.mockResolvedValue({ locatorParams: [locatorParams] });

    render(
      <EuiProvider>
        <RedirectApp
          apiClient={mockApiClient as any}
          screenshotMode={mockScreenshotMode as any}
          share={mockShare}
          history={historyMock}
        />
      </EuiProvider>
    );

    await waitFor(() =>
      expect(mockShare.navigate).toHaveBeenCalledWith({
        id: AI_VALUE_REPORT_LOCATOR,
        params: { timeRange: { from: 'now-30d', to: 'now' } },
      })
    );
  });

  it('displays error when apiClient.getInfo throws', async () => {
    setLocationSearch('?jobId=fail');
    const error = new Error('API failure');
    mockApiClient.getInfo.mockRejectedValue(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <EuiProvider>
        <RedirectApp
          apiClient={mockApiClient as any}
          screenshotMode={mockScreenshotMode as any}
          share={mockShare}
          history={historyMock}
        />
      </EuiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Redirect error')).toBeInTheDocument();
      expect(screen.getByText(error.message)).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        error.message
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('displays error when apiClient.getScheduledReportInfo throws', async () => {
    setLocationSearch('?scheduledReportId=fail&page=1&perPage=50');
    const error = new Error('API failure');
    mockApiClient.getScheduledReportInfo.mockRejectedValue(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <EuiProvider>
        <RedirectApp
          apiClient={mockApiClient as any}
          screenshotMode={mockScreenshotMode as any}
          share={mockShare}
          history={historyMock}
        />
      </EuiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Redirect error')).toBeInTheDocument();
      expect(screen.getByText(error.message)).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        error.message
      );
    });

    consoleErrorSpy.mockRestore();
  });

  describe('non-app locator', () => {
    it('throws error when jobId present in the URL returns info with legacy locator', async () => {
      setLocationSearch('?jobId=123');
      mockApiClient.getInfo.mockResolvedValue({
        locatorParams: [{ id: 'LEGACY_SHORT_URL_LOCATOR' }],
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <EuiProvider>
          <RedirectApp
            apiClient={mockApiClient as any}
            screenshotMode={mockScreenshotMode as any}
            share={mockShare}
            history={historyMock}
          />
        </EuiProvider>
      );

      // Before async effect, error should not be shown
      expect(
        screen.queryByText(
          'Report job execution can only redirect using a locator for an expected analytical app'
        )
      ).not.toBeInTheDocument();

      // Wait for error message to appear
      await waitFor(() =>
        expect(
          screen.getByText(
            'Report job execution can only redirect using a locator for an expected analytical app'
          )
        ).toBeInTheDocument()
      );

      // API client called with correct jobId
      expect(mockApiClient.getInfo).toHaveBeenCalledWith('123');

      expect(mockShare.navigate).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        'Report job execution can only redirect using a locator for an expected analytical app'
      );
      consoleErrorSpy.mockRestore();
    });

    it('throws error when screenshotMode context returns info with legacy locator', async () => {
      setLocationSearch('');
      mockScreenshotMode.getScreenshotContext.mockReturnValue({
        id: 'LEGACY_SHORT_URL_LOCATOR',
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <EuiProvider>
          <RedirectApp
            apiClient={mockApiClient as any}
            screenshotMode={mockScreenshotMode as any}
            share={mockShare}
            history={historyMock}
          />
        </EuiProvider>
      );

      await waitFor(() =>
        expect(
          screen.getByText(
            'Report job execution can only redirect using a locator for an expected analytical app'
          )
        ).toBeInTheDocument()
      );

      expect(mockScreenshotMode.getScreenshotContext).toHaveBeenCalled();
      expect(mockShare.navigate).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        'Report job execution can only redirect using a locator for an expected analytical app'
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
