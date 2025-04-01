/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { firstValueFrom } from 'rxjs';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { type FlatMetadata, MetadataService } from './metadata_service';

jest.mock('rxjs', () => {
  const RxJs = jest.requireActual('rxjs');

  return {
    ...RxJs,
    debounceTime: () => RxJs.identity, // Remove the delaying effect of debounceTime
  };
});

describe('MetadataService', () => {
  jest.useFakeTimers({ legacyFakeTimers: true });
  let metadataService: MetadataService;
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
    metadataService = new MetadataService(
      { metadata_refresh_interval: moment.duration(1, 's') },
      logger
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  const initialMetadata: FlatMetadata = {
    instanceKey: 'project-id',
    offering: 'serverless',
    version: '1.2.3',
    build_num: 123,
    build_sha: 'abcdefghijklmnopqrstux',
    build_sha_short: 'abcde',
    project_type: 'project-type',
    organizationKey: 'organization-id',
    is_elastic_staff: true,
  };

  const multiContextFormat = {
    kind: 'multi',
    kibana: {
      key: 'project-id',
      offering: 'serverless',
      version: '1.2.3',
      build_num: 123,
      build_sha: 'abcdefghijklmnopqrstux',
      build_sha_short: 'abcde',
      project_type: 'project-type',
    },
    organization: {
      key: 'organization-id',
      is_elastic_staff: true,
    },
  };

  describe('setup', () => {
    test('emits the initial metadata', async () => {
      metadataService.setup(initialMetadata);
      await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual(
        multiContextFormat
      );
    });

    test(
      'emits inTrial when trialEndDate is provided',
      fakeSchedulers(async (advance) => {
        metadataService.setup({ ...initialMetadata, trial_end_date: new Date(0) });

        // Still equals initialMetadata
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual({
          ...multiContextFormat,
          organization: {
            ...multiContextFormat.organization,
            trial_end_date: new Date(0),
          },
        });

        // After scheduler kicks in...
        advance(1); // The timer kicks in first on 0 (but let's give us 1ms so the trial is expired)
        await new Promise((resolve) => process.nextTick(resolve)); // The timer triggers a promise, so we need to skip to the next tick
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual({
          ...multiContextFormat,
          organization: {
            ...multiContextFormat.organization,
            trial_end_date: new Date(0),
            in_trial: false,
          },
        });
      })
    );
  });

  describe('start', () => {
    beforeEach(() => {
      metadataService.setup(initialMetadata);
    });

    test(
      'emits hasData after resolving the `hasUserDataView`',
      fakeSchedulers(async (advance) => {
        metadataService.start({ hasDataFetcher: async () => ({ has_data: true }) });

        // Still equals initialMetadata
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual(
          multiContextFormat
        );

        // After scheduler kicks in...
        advance(1); // The timer kicks in first on 0 (but let's give us 1ms so the trial is expired)
        await new Promise((resolve) => process.nextTick(resolve)); // The timer triggers a promise, so we need to skip to the next tick
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual({
          ...multiContextFormat,
          kibana: {
            ...multiContextFormat.kibana,
            has_data: true,
          },
        });
      })
    );

    test(
      'handles errors in hasDataFetcher',
      fakeSchedulers(async (advance) => {
        let count = 0;
        metadataService.start({
          hasDataFetcher: async () => {
            if (count++ > 0) {
              return { has_data: true };
            } else {
              throw new Error('Something went wrong');
            }
          },
        });

        // Still equals initialMetadata
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual(
          multiContextFormat
        );

        // After scheduler kicks in...
        advance(1); // The timer kicks in first on 0 (but let's give us 1ms so the trial is expired)
        await new Promise((resolve) => process.nextTick(resolve)); // The timer triggers a promise, so we need to skip to the next tick

        // Still equals initialMetadata
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual(
          multiContextFormat
        );
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn.mock.calls[0][0]).toMatchInlineSnapshot(
          `"Failed to update metadata because Error: Something went wrong"`
        );

        // After scheduler kicks in...
        advance(1_001);
        await new Promise((resolve) => process.nextTick(resolve)); // The timer triggers a promise, so we need to skip to the next tick
        await expect(firstValueFrom(metadataService.userMetadata$)).resolves.toStrictEqual({
          ...multiContextFormat,
          kibana: {
            ...multiContextFormat.kibana,
            has_data: true,
          },
        });
      })
    );
  });
});
