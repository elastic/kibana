/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { setupESDeprecationLogsPage } from './es_deprecation_logs.helpers';
import type { DeprecationLoggingStatus } from '../../../common/types';
import {
  APPS_WITH_DEPRECATION_LOGS,
  DEPRECATION_LOGS_ORIGIN_FIELD,
  DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS,
} from '../../../common/constants';
import { setupEnvironment } from '../helpers/setup_environment';
import { advanceTime } from '../helpers/time_manipulation';
// Once the logs team register the kibana locators in their app, we should be able
// to remove this mock and follow a similar approach to how discover link is tested.
// See: https://github.com/elastic/kibana/issues/104855
jest.mock('../../../public/application/lib/logs_checkpoint', () => {
  const originalModule = jest.requireActual('../../../public/application/lib/logs_checkpoint');

  return {
    __esModule: true,
    ...originalModule,
    loadLogsCheckpoint: jest.fn().mockReturnValue('2021-09-05T10:49:01.805Z'),
  };
});

const getLoggingResponse = (toggle: boolean): DeprecationLoggingStatus => ({
  isDeprecationLogIndexingEnabled: toggle,
  isDeprecationLoggingEnabled: toggle,
});

describe('ES deprecation logs flyout', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  const openFlyoutLoggingEnabled = async () => {
    const openFlyoutLink = await screen.findByTestId('viewDetailsLink');
    // DiscoverExternalLinks loads the data view asynchronously on mount; await the button so the
    // state update is wrapped by RTL async utilities (prevents act warnings).
    await screen.findByTestId('viewDiscoverLogsButton');
    fireEvent.click(openFlyoutLink);
    await screen.findByTestId('flyoutTitle');
    // External links are rendered only after DiscoverExternalLinks loads the data view asynchronously.
    // Await the link so the mount-time state update is wrapped by RTL's async utilities (prevents act warnings).
    await screen.findByTestId('viewDiscoverLogs');
  };

  const openFlyoutLoggingDisabled = async () => {
    const openFlyoutLink = await screen.findByTestId('enableLogsLink');
    fireEvent.click(openFlyoutLink);
    await screen.findByTestId('flyoutTitle');
  };

  const closeFlyout = async () => {
    fireEvent.click(screen.getByTestId('closeEsDeprecationLogs'));
    await waitFor(() => {
      expect(screen.queryByTestId('flyoutTitle')).toBeNull();
    });
  };

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(true));
    httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(getLoggingResponse(true));
    httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({ count: 0 });
  });
  test('opens flyout with logging enabled', async () => {
    await setupESDeprecationLogsPage(httpSetup);
    await openFlyoutLoggingEnabled();

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent('Elasticsearch deprecation logs');
    expect(await screen.findByTestId('noWarningsCallout')).toBeInTheDocument();
    expect(screen.getByTestId('closeEsDeprecationLogs')).toBeInTheDocument();
    expect(screen.getByTestId('resetLastStoredDate')).toBeInTheDocument();
    expect(screen.getByTestId('deprecationLogsDescription')).toBeInTheDocument();
    expect(screen.getByTestId('deprecationLoggingToggle')).toBeInTheDocument();
    expect(screen.getByTestId('viewDiscoverLogs')).toBeInTheDocument();
    expect(screen.getByTestId('apiCompatibilityNoteTitle')).toBeInTheDocument();

    await closeFlyout();
  });
  test('opens flyout with logging disabled', async () => {
    httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(false));
    httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(getLoggingResponse(false));

    await setupESDeprecationLogsPage(httpSetup);
    await openFlyoutLoggingDisabled();

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent('Elasticsearch deprecation logs');
    expect(screen.queryByTestId('noWarningsCallout')).toBeNull();
    expect(screen.queryByTestId('hasWarningsCallout')).toBeNull();
    expect(screen.getByTestId('deprecationLogsDescription')).toBeInTheDocument();
    expect(screen.getByTestId('deprecationLoggingToggle')).toBeInTheDocument();
    expect(screen.queryByTestId('viewDiscoverLogs')).toBeNull();
    expect(screen.queryByTestId('apiCompatibilityNoteTitle')).toBeNull();
    expect(screen.getByTestId('closeEsDeprecationLogs')).toBeInTheDocument();
    expect(screen.queryByTestId('resetLastStoredDate')).toBeNull();

    await closeFlyout();
  });
  describe('banner', () => {
    test('shows success callout if no warnings', async () => {
      await setupESDeprecationLogsPage(httpSetup);
      await openFlyoutLoggingEnabled();

      const noWarningsCallout = await screen.findByTestId('noWarningsCallout');
      expect(noWarningsCallout).toHaveTextContent('No deprecation issues');
    });
    test('shows callout with the number of warnings', async () => {
      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 10,
      });

      await setupESDeprecationLogsPage(httpSetup);
      await openFlyoutLoggingEnabled();

      const hasWarningsCallout = await screen.findByTestId('hasWarningsCallout');
      expect(hasWarningsCallout).toHaveTextContent('10');
    });
  });

  describe('Flyout - Toggle log writing and collecting', () => {
    test('toggles deprecation logging', async () => {
      await setupESDeprecationLogsPage(httpSetup);
      await openFlyoutLoggingEnabled();

      const toggle = screen.getByTestId('deprecationLoggingToggle');
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `/api/upgrade_assistant/deprecation_logging`,
          expect.objectContaining({ body: JSON.stringify({ isEnabled: false }) })
        );
      });
    });

    test('handles network error when updating logging state', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(false));
      httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(undefined, error);

      await setupESDeprecationLogsPage(httpSetup);
      await openFlyoutLoggingDisabled();

      fireEvent.click(screen.getByTestId('deprecationLoggingToggle'));

      expect(await screen.findByTestId('updateLoggingError')).toBeInTheDocument();
    });

    test('does not show external links and deprecations count when toggle is disabled', async () => {
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(false));
      httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(getLoggingResponse(false));

      await setupESDeprecationLogsPage(httpSetup);
      await openFlyoutLoggingDisabled();

      expect(screen.queryByTestId('externalLinksTitle')).toBeNull();
      expect(screen.queryByTestId('apiCompatibilityNoteTitle')).toBeNull();
    });
  });

  describe('analyze logs', () => {
    test('has a link to see logs in discover app', async () => {
      await setupESDeprecationLogsPage(httpSetup);
      await openFlyoutLoggingEnabled();

      const href = (screen.getByTestId('viewDiscoverLogs') as HTMLAnchorElement).getAttribute(
        'href'
      );
      expect(href).not.toBeNull();

      const decodedUrl = decodeURIComponent(href!);
      expect(decodedUrl).toContain('discoverUrl');
      [
        '"language":"kuery"',
        '"query":"@timestamp+>',
        'filters=',
        DEPRECATION_LOGS_ORIGIN_FIELD,
        ...APPS_WITH_DEPRECATION_LOGS,
      ].forEach((param) => {
        try {
          expect(decodedUrl).toContain(param);
        } catch (e) {
          throw new Error(`Expected [${param}] not found in ${decodedUrl}`);
        }
      });
    });
  });

  describe('reset counter', () => {
    beforeEach(() => {
      httpRequestsMockHelpers.setDeleteLogsCacheResponse('ok');
    });

    test('Allows user to reset last stored date', async () => {
      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 10,
      });

      await setupESDeprecationLogsPage(httpSetup);
      await openFlyoutLoggingEnabled();
      await screen.findByTestId('hasWarningsCallout');
      await screen.findByTestId('resetLastStoredDate');

      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 0,
      });

      fireEvent.click(screen.getByTestId('resetLastStoredDate'));

      expect(await screen.findByTestId('noWarningsCallout')).toBeInTheDocument();
    });

    test('Shows a toast if deleting cache fails', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setDeleteLogsCacheResponse(undefined, error);
      // Initially we want to have the callout to have a warning state
      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({ count: 10 });

      const addDanger = jest.fn();
      await setupESDeprecationLogsPage(httpSetup, {
        services: {
          core: {
            notifications: {
              toasts: {
                addDanger,
              },
            },
          },
        },
      });

      await openFlyoutLoggingEnabled();
      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({ count: 0 });

      fireEvent.click(screen.getByTestId('resetLastStoredDate'));

      // The toast should always be shown if the delete logs cache fails.
      await waitFor(() => expect(addDanger).toHaveBeenCalled());
      // Even though we changed the response of the getLogsCountResponse, when the
      // deleteLogsCache fails the getLogsCount api should not be called and the
      // status of the callout should remain the same it initially was.
      expect(await screen.findByTestId('hasWarningsCallout')).toBeInTheDocument();
    });

    describe('Poll for logs count', () => {
      beforeEach(async () => {
        jest.useFakeTimers();

        // First request should make the step be complete
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 0,
        });

        await setupESDeprecationLogsPage(httpSetup);
      });

      afterEach(async () => {
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
        jest.clearAllTimers();
        jest.useRealTimers();
      });

      test('success state is followed by an error state', async () => {
        await openFlyoutLoggingEnabled();
        expect(await screen.findByTestId('resetLastStoredDate')).toBeInTheDocument();

        // second request will error
        const error = {
          statusCode: 500,
          error: 'Internal server error',
          message: 'Internal server error',
        };
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse(undefined, error);

        // Resolve the polling timeout.
        await advanceTime(DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS);

        expect(await screen.findByTestId('errorCallout')).toBeInTheDocument();
      });
    });
  });
});
