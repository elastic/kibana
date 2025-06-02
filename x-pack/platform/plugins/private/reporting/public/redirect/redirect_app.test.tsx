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

const mockApiClient = {
  getInfo: jest.fn(),
};
const mockScreenshotMode = {
  getScreenshotContext: jest.fn(),
};
const mockShare = {
  navigate: jest.fn(),
};
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
    const locatorParams = { id: 'SOME_LOCATOR', params: { foo: 'bar' } };
    mockApiClient.getInfo.mockResolvedValue({ locatorParams: [locatorParams] });
    mockShare.navigate.mockResolvedValue(undefined);

    render(
      <EuiProvider>
        <RedirectApp
          apiClient={mockApiClient as any}
          screenshotMode={mockScreenshotMode as any}
          share={mockShare as any}
        />
      </EuiProvider>
    );

    await waitFor(() => {
      expect(mockApiClient.getInfo).toHaveBeenCalledWith('happy');
      expect(mockShare.navigate).toHaveBeenCalledWith(locatorParams);
    });
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
          share={mockShare as any}
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

  describe('when locatorParams.id is legacy', () => {
    it('throws error when jobId is present in the URL', async () => {
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
            share={mockShare as any}
          />
        </EuiProvider>
      );

      // Before async effect, error should not be shown
      expect(
        screen.queryByText('The legacy short URL locator is not supported for opening report URLs.')
      ).not.toBeInTheDocument();

      // Wait for error message to appear
      await waitFor(() =>
        expect(
          screen.getByText('The legacy short URL locator is not supported for opening report URLs.')
        ).toBeInTheDocument()
      );

      // API client called with correct jobId
      expect(mockApiClient.getInfo).toHaveBeenCalledWith('123');

      expect(mockShare.navigate).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        'The legacy short URL locator is not supported for opening report URLs.'
      );
      consoleErrorSpy.mockRestore();
    });

    it('throws error when jobId is missing and screenshotMode returns legacy locator', async () => {
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
            share={mockShare as any}
          />
        </EuiProvider>
      );

      await waitFor(() =>
        expect(
          screen.getByText('The legacy short URL locator is not supported for opening report URLs.')
        ).toBeInTheDocument()
      );

      expect(mockScreenshotMode.getScreenshotContext).toHaveBeenCalled();
      expect(mockShare.navigate).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redirect page error:'),
        'The legacy short URL locator is not supported for opening report URLs.'
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
