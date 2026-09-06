/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { StaleEventCleanupSection } from './stale_event_cleanup_section';

jest.mock('../../../../hooks/use_kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const fetch = jest.fn();
const addSuccess = jest.fn();
const addError = jest.fn();

const renderSection = (canManage = true) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <StaleEventCleanupSection canManage={canManage} />
      </I18nProvider>
    </QueryClientProvider>
  );
};

describe('StaleEventCleanupSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      core: {
        notifications: { toasts: { addSuccess, addError } },
      },
      dependencies: {
        start: {
          significantEvents: { significantEventsRepositoryClient: { fetch } },
        },
      },
    } as never);
  });

  it('runs cleanup and reports the number of closed events', async () => {
    fetch.mockResolvedValue({ scanned: 3, closed: 2, kept: 1, skipped: 0 });
    renderSection();

    fireEvent.click(screen.getByTestId('streams-settings-stale-event-cleanup-button'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('POST /internal/significant_events/events/_cleanup', {
        signal: null,
      });
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Closed 2 stale events' });
    });
  });

  it('disables cleanup without the Streams manage privilege', () => {
    renderSection(false);

    expect(screen.getByTestId('streams-settings-stale-event-cleanup-button')).toBeDisabled();
  });

  it('keeps the action loading until cleanup settles and reports failures', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let rejectRequest: (error: Error) => void = () => undefined;
    fetch.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      })
    );
    renderSection();

    const button = screen.getByTestId('streams-settings-stale-event-cleanup-button');
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());

    rejectRequest(new Error('cleanup failed'));
    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(button).toBeEnabled();
    consoleErrorSpy.mockRestore();
  });
});
