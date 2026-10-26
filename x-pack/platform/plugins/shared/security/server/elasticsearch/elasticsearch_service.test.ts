/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { CoreStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { ElasticsearchService } from './elasticsearch_service';
import type { SecurityLicense, SecurityLicenseFeatures } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  beforeEach(() => {
    service = new ElasticsearchService(loggingSystemMock.createLogger());
  });

  describe('setup()', () => {
    it('exposes proper contract', () => {
      expect(
        service.setup({
          status: coreMock.createSetup().status,
          license: licenseMock.create(),
        })
      ).toBeUndefined();
    });
  });

  describe('start()', () => {
    let mockLicense: jest.Mocked<SecurityLicense>;
    let mockStatusSubject: BehaviorSubject<CoreStatus>;
    let mockLicenseSubject: BehaviorSubject<SecurityLicenseFeatures>;
    beforeEach(() => {
      mockLicenseSubject = new BehaviorSubject({} as unknown as SecurityLicenseFeatures);
      mockLicense = licenseMock.create();
      mockLicense.isEnabled.mockReturnValue(false);
      mockLicense.features$ = mockLicenseSubject;

      mockStatusSubject = new BehaviorSubject<CoreStatus>({
        elasticsearch: {
          level: ServiceStatusLevels.unavailable,
          summary: 'Service is NOT working',
        },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockStatus = coreMock.createSetup().status;
      mockStatus.core$ = mockStatusSubject;

      service.setup({
        status: mockStatus,
        license: mockLicense,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('exposes proper contract', () => {
      expect(service.start()).toEqual({ watchOnlineStatus$: expect.any(Function) });
    });

    it('`watchOnlineStatus$` allows tracking of Elasticsearch status', () => {
      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);

      // Neither ES nor license is available yet.
      expect(mockHandler).not.toHaveBeenCalled();

      // ES is available now, but not license.
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });
      expect(mockHandler).not.toHaveBeenCalled();

      // Both ES and license are available.
      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('`watchOnlineStatus$` allows to schedule retry', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      // Pin the jitter to its lower bound, so every delay is half of its max.
      jest.spyOn(Math, 'random').mockReturnValue(0);

      // Both ES and license are available.
      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      const [[{ scheduleRetry }]] = mockHandler.mock.calls;

      const expectRetryAfter = async (delay: number) => {
        const callCount = mockHandler.mock.calls.length;
        scheduleRetry();
        await nextTick();
        jest.advanceTimersByTime(delay - 1);
        expect(mockHandler).toHaveBeenCalledTimes(callCount);
        jest.advanceTimersByTime(1);
        expect(mockHandler).toHaveBeenCalledTimes(callCount + 1);
        await nextTick();
      };

      // Delay between consequent retries doubles until it reaches the max.
      await expectRetryAfter(500);
      await expectRetryAfter(1000);
      await expectRetryAfter(2000);
      await expectRetryAfter(4000);
      await expectRetryAfter(5000);
      await expectRetryAfter(5000);
      expect(mockHandler).toHaveBeenCalledTimes(7);

      // If `scheduleRetry` isn't called retries aren't scheduled anymore.
      jest.runAllTimers();
      expect(mockHandler).toHaveBeenCalledTimes(7);

      // New changes still trigger handler once again and reset retry timer.
      mockLicenseSubject.next({ allowRbac: true } as unknown as SecurityLicenseFeatures);
      expect(mockHandler).toHaveBeenCalledTimes(8);

      // Retry timer is reset.
      await nextTick();
      await expectRetryAfter(500);
    });

    it('`watchOnlineStatus$` randomizes the upper half of the retry delay', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      // Pin the jitter to its upper bound, so every delay is (almost) its max.
      jest.spyOn(Math, 'random').mockReturnValue(1 - Number.EPSILON);

      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      const [[{ scheduleRetry }]] = mockHandler.mock.calls;

      scheduleRetry();
      await nextTick();
      jest.advanceTimersByTime(999);
      expect(mockHandler).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('`watchOnlineStatus$` keeps a single pending retry', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      jest.spyOn(Math, 'random').mockReturnValue(0);

      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      const [[{ scheduleRetry }]] = mockHandler.mock.calls;

      scheduleRetry();
      scheduleRetry();
      await nextTick();
      jest.runAllTimers();
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('`watchOnlineStatus$` cancels scheduled retry if status changes before retry timeout fires', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });

      // Both ES and license are available.
      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      const [[{ scheduleRetry }]] = mockHandler.mock.calls;

      // Schedule a retry.
      scheduleRetry();
      await nextTick();
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // New changes should immediately call handler.
      mockLicenseSubject.next({ allowRbac: true } as unknown as SecurityLicenseFeatures);
      expect(mockHandler).toHaveBeenCalledTimes(2);

      // Retry timeout should have been cancelled.
      await nextTick();
      jest.runAllTimers();
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('`watchOnlineStatus$` ignores core status changes that tasks do not depend on', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      jest.spyOn(Math, 'random').mockReturnValue(0);

      mockLicense.isEnabled.mockReturnValue(true);
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      const [[{ scheduleRetry }]] = mockHandler.mock.calls;
      scheduleRetry();
      await nextTick();

      // Only the saved objects status changes, so nothing is emitted.
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.available, summary: 'Service is working' },
      });
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // The pending retry wasn't cancelled.
      jest.advanceTimersByTime(500);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('`watchOnlineStatus$` emits when the license type changes even if features do not', async () => {
      mockLicense.isEnabled.mockReturnValue(true);
      mockLicense.getLicenseType.mockReturnValue('platinum');
      mockStatusSubject.next({
        elasticsearch: { level: ServiceStatusLevels.available, summary: 'Service is working' },
        savedObjects: { level: ServiceStatusLevels.unavailable, summary: 'Service is NOT working' },
      });

      const mockHandler = jest.fn();
      service.start().watchOnlineStatus$().subscribe(mockHandler);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // The same features again, with the same license type.
      mockLicenseSubject.next({} as unknown as SecurityLicenseFeatures);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Platinum and enterprise have the same features, but privileges can differ between them.
      mockLicense.getLicenseType.mockReturnValue('enterprise');
      mockLicenseSubject.next({} as unknown as SecurityLicenseFeatures);
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });
});
