/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import type { TelemetryEventsSender } from '../telemetry/sender';
import { createMockTelemetryEventsSender } from '../telemetry/__mocks__';

import { sendTelemetryEvents, capErrorSize, UpdateEventType } from './upgrade_sender';
import type { PackageUpdateEvent } from './upgrade_sender';

describe('sendTelemetryEvents', () => {
  let eventsTelemetryMock: jest.Mocked<TelemetryEventsSender>;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    eventsTelemetryMock = createMockTelemetryEventsSender();
    loggerMock = loggingSystemMock.createLogger();
  });

  it('should queue telemetry events with generic error', () => {
    const upgradeMessage: PackageUpdateEvent = {
      packageName: 'aws',
      currentVersion: '0.6.1',
      newVersion: '1.3.0',
      status: 'failure',
      error: [
        { key: 'queueUrl', message: ['Queue URL is required'] },
        { message: 'Invalid format' },
      ],
      dryRun: true,
      eventType: UpdateEventType.PACKAGE_POLICY_UPGRADE,
    };

    sendTelemetryEvents(loggerMock, eventsTelemetryMock, upgradeMessage);

    expect(eventsTelemetryMock.queueTelemetryEvents).toHaveBeenCalledWith('fleet-upgrades', [
      {
        currentVersion: '0.6.1',
        error: [
          {
            key: 'queueUrl',
            message: ['Queue URL is required'],
          },
          {
            message: 'Invalid format',
          },
        ],
        errorMessage: ['Field is required', 'Invalid format'],
        newVersion: '1.3.0',
        packageName: 'aws',
        status: 'failure',
        dryRun: true,
        eventType: 'package-policy-upgrade',
      },
    ]);
  });

  it('should cap error size', () => {
    const maxSize = 2;
    const errors = [{ message: '1' }, { message: '2' }, { message: '3' }];

    const result = capErrorSize(errors, maxSize);

    expect(result.length).toEqual(maxSize);
  });
});
