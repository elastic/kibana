/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  notificationCoordinator,
  Coordinator,
} from '@kbn/core-notifications-browser-internal/src/notification_coordinator';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import {
  InterceptDialogService,
  type InterceptServiceSetupDeps,
  type InterceptServiceStartDeps,
} from './intercept_dialog_service';

const staticAssetsHelperMock = httpServiceMock.createSetupContract().staticAssets;

const mockPerformanceMark = jest.fn(
  (name) =>
    ({
      name,
      startTime: 0,
      duration: 0,
      entryType: 'mark',
      detail: {},
      toJSON: () => ({}),
    } as PerformanceMark)
);

const mockPerformanceMeasure = jest.fn(
  (name) =>
    ({
      name,
      startTime: 0,
      duration: 0,
      entryType: 'measure',
      detail: {},
      toJSON: () => ({}),
    } as PerformanceMeasure)
);

describe('InterceptDialogService', () => {
  // Force React to flush updates synchronously in tests
  beforeAll(() => {
    // Mock performance APIs
    window.performance.mark = mockPerformanceMark;
    window.performance.measure = mockPerformanceMeasure;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes a setup and start method', () => {
    const interceptDialogService = new InterceptDialogService();

    expect(interceptDialogService).toHaveProperty('setup', expect.any(Function));
    expect(interceptDialogService).toHaveProperty('start', expect.any(Function));
    expect(interceptDialogService).toHaveProperty('stop', expect.any(Function));
  });

  describe('#start', () => {
    let interceptDialogService: InterceptDialogService;
    let startContract: ReturnType<InterceptDialogService['start']>;

    let setupDeps: InterceptServiceSetupDeps;
    let startDeps: InterceptServiceStartDeps;

    beforeAll(() => {
      setupDeps = {
        analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
        notifications: notificationServiceMock.createSetupContract(),
      };
    });

    beforeEach(() => {
      interceptDialogService = new InterceptDialogService();

      startDeps = {
        analytics: analyticsServiceMock.createAnalyticsServiceStart(),
        rendering: renderingServiceMock.create(),
        targetDomElement: document.createElement('div'),
        persistInterceptRunId: jest.fn(),
        staticAssetsHelper: staticAssetsHelperMock,
        resetInterceptTimingRecord: jest.fn(),
      };

      // append the target dom element to the body
      // to ensure renders that target this element reflect in the DOM
      document.body.appendChild(startDeps.targetDomElement);
    });

    afterEach(() => {
      interceptDialogService.stop();

      // cleanup the target dom element from the document across tests
      document.body.removeChild(startDeps.targetDomElement);
      startDeps.targetDomElement.remove();
    });

    it('exposes an expected set of properties', () => {
      interceptDialogService.setup(setupDeps);

      startContract = interceptDialogService.start(startDeps);

      expect(startContract).toStrictEqual({
        add: expect.any(Function),
      });
    });

    it('invoking the add method will queue a new intercept and render it', async () => {
      const coordinator = new Coordinator();

      // create an isolated notifications coordinator the intercept dialog service will use to coordinate with the main notifications coordinator
      const interceptDialogCoordinator = notificationCoordinator.bind(coordinator);

      interceptDialogService.setup({
        ...setupDeps,
        notifications: {
          ...setupDeps.notifications,
          coordinator: interceptDialogCoordinator,
        },
      });

      act(() => {
        startContract = interceptDialogService.start(startDeps);
      });

      // Add an intercept to be displayed
      act(() => {
        startContract.add({
          id: 'test-intercept',
          runId: 1,
          onFinish: jest.fn(),
          steps: [
            { id: 'start', title: 'Welcome Survey', content: () => 'Fill out our survey' },
            {
              id: 'completion',
              title: 'Thank You',
              content: () => 'Thanks for participating',
            },
          ],
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check the dialog has the correct test ID
      expect(screen.getByTestId('intercept-test-intercept')).toBeInTheDocument();

      // Check the first step is displayed
      expect(screen.getByTestId('interceptStep-start')).toBeInTheDocument();

      // Check the title is rendered
      expect(screen.getByRole('heading', { name: 'Welcome Survey' })).toBeInTheDocument();

      // Check the content is rendered
      expect(screen.getByText('Fill out our survey')).toBeInTheDocument();

      // Check the action buttons are present
      expect(screen.getByTestId('productInterceptDismissButton')).toBeInTheDocument();
      expect(screen.getByTestId('productInterceptProgressionButton')).toBeInTheDocument();
    });

    it('processes multiple queued intercepts sequentially', async () => {
      const user = userEvent.setup();
      const coordinator = new Coordinator();

      const interceptDialogCoordinator = notificationCoordinator.bind(coordinator);

      interceptDialogService.setup({
        ...setupDeps,
        notifications: {
          ...setupDeps.notifications,
          coordinator: interceptDialogCoordinator,
        },
      });

      act(() => {
        startContract = interceptDialogService.start(startDeps);
      });

      await act(async () => {
        // simulate the scenario where two intercepts are queued at the same time
        await Promise.all([
          Promise.resolve([
            {
              id: 'upgrade-intercept',
              runId: 1,
              onFinish: jest.fn(),
              steps: [
                {
                  id: 'start',
                  title: 'Upgrade Survey',
                  content: () => 'Fill out our upgrade survey',
                },
                {
                  id: 'completion',
                  title: 'Upgrade Done',
                  content: () => 'Thank you for upgrading',
                },
              ],
            },
          ] as Parameters<ReturnType<InterceptDialogService['start']>['add']>).then((intercept) =>
            startContract.add(...intercept)
          ),
          Promise.resolve([
            {
              id: 'security-intercept',
              runId: 1,
              onFinish: jest.fn(),
              steps: [
                {
                  id: 'start',
                  title: 'Security Survey',
                  content: () => 'Fill out the security survey',
                },
                {
                  id: 'completion',
                  title: 'Security Done',
                  content: () => 'Thank you for completing the security survey',
                },
              ],
            },
          ] as Parameters<ReturnType<InterceptDialogService['start']>['add']>).then((intercept) =>
            startContract.add(...intercept)
          ),
        ]);
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: 'Upgrade Survey' })).toBeInTheDocument();

      // dismiss the upgrade intercept
      await user.click(screen.getByTestId('productInterceptDismissButton'));

      // shortly after the upgrade intercept is dismissed, expect another intercept to be rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // verify that the rendered intercept is the security intercept
      expect(screen.getByRole('heading', { name: 'Security Survey' })).toBeInTheDocument();

      // dismiss the security intercept
      await user.click(screen.getByTestId('productInterceptDismissButton'));

      expect(startDeps.resetInterceptTimingRecord).toHaveBeenCalled();
    });

    it('eventually displays a queued intercept when said intercept gets queued while the notifications coordination lock is held by another coordinator', async () => {
      const coordinator = new Coordinator();

      // this notifications coordinator is used in this test to adjust the lock state,
      // so we can test how the intercept queue is modulated based on the lock state
      const ancillaryNotificationsCoordinator = notificationCoordinator.call(
        coordinator,
        'ancillary'
      );

      const interceptDialogCoordinator = notificationCoordinator.bind(coordinator);

      interceptDialogService.setup({
        ...setupDeps,
        notifications: {
          ...setupDeps.notifications,
          coordinator: interceptDialogCoordinator,
        },
      });

      act(() => {
        startContract = interceptDialogService.start(startDeps);
      });

      act(() => {
        // acquire lock for ancillary notifications coordinator to prevent intercepts from being displayed
        ancillaryNotificationsCoordinator.acquireLock();
      });

      act(() => {
        startContract.add({
          id: 'test-intercept',
          runId: 1,
          onFinish: jest.fn(),
          steps: [
            { id: 'start', title: 'Survey', content: () => 'Fill out our survey' },
            {
              id: 'completion',
              title: 'Done',
              content: () => 'Thank you',
            },
          ],
        });
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      act(() => {
        // release lock for ancillary notifications coordinator to allow intercepts to be displayed
        ancillaryNotificationsCoordinator.releaseLock();
      });

      // Verify the intercept is rendered after lock is released
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByTestId('intercept-test-intercept')).toBeInTheDocument();
      expect(screen.getByTestId('interceptStep-start')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Survey' })).toBeInTheDocument();
    });
  });
});
