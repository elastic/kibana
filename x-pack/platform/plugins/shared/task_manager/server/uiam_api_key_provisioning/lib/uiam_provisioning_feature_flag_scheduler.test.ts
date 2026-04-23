/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { CoreStart } from '@kbn/core/server';
import type { TaskScheduling } from '../../task_scheduling';
import { UiamProvisioningFeatureFlagScheduler } from './uiam_provisioning_feature_flag_scheduler';

describe('UiamProvisioningFeatureFlagScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reacts only to flag value changes via distinctUntilChanged', async () => {
    const flag$ = new Subject<boolean>();
    const logger = loggingSystemMock.createLogger();
    const scheduler = new UiamProvisioningFeatureFlagScheduler(logger);

    const core = {
      featureFlags: {
        getBooleanValue$: jest.fn().mockReturnValue(flag$),
      },
    } as unknown as CoreStart;
    const taskScheduling = {
      ensureScheduled: jest.fn().mockResolvedValue(undefined),
    } as unknown as TaskScheduling;
    const removeIfExists = jest.fn().mockResolvedValue(undefined);

    scheduler.start({
      core,
      taskScheduling,
      removeIfExists,
      schedule: { interval: '1d' },
    });

    flag$.next(true);
    flag$.next(true);
    flag$.next(false);
    flag$.next(false);
    await Promise.resolve();

    expect(taskScheduling.ensureScheduled).toHaveBeenCalledTimes(1);
    expect(removeIfExists).toHaveBeenCalledTimes(1);
  });
});
