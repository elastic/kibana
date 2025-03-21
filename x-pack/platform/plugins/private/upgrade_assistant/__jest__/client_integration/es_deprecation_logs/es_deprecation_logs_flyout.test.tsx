/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import {
  EsDeprecationLogsTestBed,
  setupESDeprecationLogsPage,
} from './es_deprecation_logs.helpers';
import { setupEnvironment } from '../helpers';
import { DeprecationLoggingStatus } from '../../../common/types';
import {
  APPS_WITH_DEPRECATION_LOGS,
  DEPRECATION_LOGS_ORIGIN_FIELD,
  DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS,
} from '../../../common/constants';
import { advanceTime } from '../helpers';
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
  let testBed: EsDeprecationLogsTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(true));
    httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(getLoggingResponse(true));
    testBed = await setupESDeprecationLogsPage(httpSetup);
    testBed.component.update();
  });
  test('opens flyout with logging enabled', async () => {
    const { exists, actions, find } = testBed;

    await actions.clickOpenFlyoutLoggingEnabled();

    expect(exists('flyoutTitle')).toBe(true);
    expect(find('flyoutTitle').text()).toContain('Elasticsearch deprecation logs');
    expect(exists('noWarningsCallout')).toBe(true);
    expect(exists('closeEsDeprecationLogs')).toBe(true);
    expect(exists('resetLastStoredDate')).toBe(true);
    expect(exists('deprecationLogsDescription')).toBe(true);
    expect(exists('deprecationLoggingToggle')).toBe(true);
    expect(exists('viewDiscoverLogs')).toBe(true);
    expect(exists('apiCompatibilityNoteTitle')).toBe(true);

    await actions.clickCloseFlyout();

    expect(exists('flyoutTitle')).toBe(false);
  });
  test('opens flyout with logging disabled', async () => {
    httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(false));
    await act(async () => {
      testBed = await setupESDeprecationLogsPage(httpSetup);
    });

    const { exists, component, actions, find } = testBed;

    component.update();

    await actions.clickOpenFlyoutLoggingDisabled();

    expect(exists('flyoutTitle')).toBe(true);
    expect(find('flyoutTitle').text()).toContain('Elasticsearch deprecation logs');
    expect(exists('noWarningsCallout')).toBe(false);
    expect(exists('hasWarningsCallout')).toBe(false);
    expect(exists('deprecationLogsDescription')).toBe(true);
    expect(exists('deprecationLoggingToggle')).toBe(true);
    expect(exists('viewDiscoverLogs')).toBe(false);
    expect(exists('apiCompatibilityNoteTitle')).toBe(false);
    expect(exists('closeEsDeprecationLogs')).toBe(true);
    expect(exists('resetLastStoredDate')).toBe(false);

    await actions.clickCloseFlyout();

    expect(exists('flyoutTitle')).toBe(false);
  });
  describe('banner', () => {
    test('shows success callout if no warnings', async () => {
      const { exists, actions, find } = testBed;

      await actions.clickOpenFlyoutLoggingEnabled();

      expect(exists('noWarningsCallout')).toBe(true);
      expect(find('noWarningsCallout').text()).toContain('No deprecation issues');
    });
    test('shows callout with the number of warnings', async () => {
      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 10,
      });

      await act(async () => {
        testBed = await setupESDeprecationLogsPage(httpSetup);
      });

      const { exists, component, actions, find } = testBed;

      component.update();
      await actions.clickOpenFlyoutLoggingEnabled();

      expect(exists('hasWarningsCallout')).toBe(true);
      expect(find('hasWarningsCallout').text()).toContain('10');
    });
  });

  describe('Flyout - Toggle log writing and collecting', () => {
    test('toggles deprecation logging', async () => {
      const { find, actions } = testBed;

      await actions.clickOpenFlyoutLoggingEnabled();

      expect(find('deprecationLoggingToggle').props()['aria-checked']).toBe(true);

      await actions.clickDeprecationToggle();

      expect(httpSetup.put).toHaveBeenLastCalledWith(
        `/api/upgrade_assistant/deprecation_logging`,
        expect.objectContaining({ body: JSON.stringify({ isEnabled: false }) })
      );
    });

    test('handles network error when updating logging state', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(false));
      httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(undefined, error);

      await act(async () => {
        testBed = await setupESDeprecationLogsPage(httpSetup);
      });

      const { exists, actions, component } = testBed;

      component.update();

      await actions.clickOpenFlyoutLoggingDisabled();

      await actions.clickDeprecationToggle();

      expect(exists('updateLoggingError')).toBe(true);
    });

    test('does not show external links and deprecations count when toggle is disabled', async () => {
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(getLoggingResponse(false));
      await act(async () => {
        testBed = await setupESDeprecationLogsPage(httpSetup);
      });

      const { exists, actions, component } = testBed;
      component.update();
      await actions.clickOpenFlyoutLoggingDisabled();

      expect(exists('externalLinksTitle')).toBe(false);
      expect(exists('apiCompatibilityNoteTitle')).toBe(false);
    });
  });

  describe('analyze logs', () => {
    test('has a link to see logs in discover app', async () => {
      const { exists, find, actions } = testBed;

      await actions.clickOpenFlyoutLoggingEnabled();

      expect(exists('viewDiscoverLogs')).toBe(true);

      const decodedUrl = decodeURIComponent(find('viewDiscoverLogs').props().href);
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
    beforeEach(async () => {
      httpRequestsMockHelpers.setDeleteLogsCacheResponse('ok');
    });

    test('Allows user to reset last stored date', async () => {
      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 10,
      });

      await act(async () => {
        testBed = await setupESDeprecationLogsPage(httpSetup);
      });

      const { exists, actions, component } = testBed;

      component.update();

      await actions.clickOpenFlyoutLoggingEnabled();
      expect(exists('hasWarningsCallout')).toBe(true);
      expect(exists('resetLastStoredDate')).toBe(true);

      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 0,
      });

      await actions.clickResetButton();

      expect(exists('noWarningsCallout')).toBe(true);
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
      await act(async () => {
        testBed = await setupESDeprecationLogsPage(httpSetup, {
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
      });

      const { exists, actions, component } = testBed;

      component.update();

      await actions.clickOpenFlyoutLoggingEnabled();
      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({ count: 0 });

      await actions.clickResetButton();

      // The toast should always be shown if the delete logs cache fails.
      expect(addDanger).toHaveBeenCalled();
      // Even though we changed the response of the getLogsCountResponse, when the
      // deleteLogsCache fails the getLogsCount api should not be called and the
      // status of the callout should remain the same it initially was.
      expect(exists('hasWarningsCallout')).toBe(true);
    });

    describe('Poll for logs count', () => {
      beforeEach(async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });

        // First request should make the step be complete
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 0,
        });

        testBed = await setupESDeprecationLogsPage(httpSetup);
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      test('success state is followed by an error state', async () => {
        const { exists, actions } = testBed;

        await actions.clickOpenFlyoutLoggingEnabled();
        expect(exists('resetLastStoredDate')).toBe(true);

        // second request will error
        const error = {
          statusCode: 500,
          error: 'Internal server error',
          message: 'Internal server error',
        };
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse(undefined, error);

        // Resolve the polling timeout.
        await advanceTime(DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS);
        testBed.component.update();

        expect(exists('errorCallout')).toBe(true);
      });
    });
  });
});
