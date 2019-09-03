/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { DiskWatermarkService } from './disk_watermark';
import { Logger } from './log';
import { ServerOptions } from './server_options';
import { ConsoleLoggerFactory } from './utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

afterEach(() => {
  sinon.restore();
});

test('Disk watermark check in percentage mode', async () => {
  const diskCheckerStub = sinon.stub();
  diskCheckerStub
    .onFirstCall()
    .resolves({
      free: 5,
      size: 10,
    })
    .onSecondCall()
    .returns({
      free: 1,
      size: 10,
    });
  const diskWatermarkService = new DiskWatermarkService(
    diskCheckerStub,
    {
      disk: {
        thresholdEnabled: true,
        watermarkLow: '80%',
      },
      repoPath: '/',
    } as ServerOptions,
    log
  );

  expect(await diskWatermarkService.isLowWatermark()).toBeFalsy(); // 50% usage
  expect(await diskWatermarkService.isLowWatermark()).toBeTruthy(); // 90% usage
});

test('Disk watermark check in absolute mode in kb', async () => {
  const diskCheckerStub = sinon.stub();
  diskCheckerStub
    .onFirstCall()
    .resolves({
      free: 8 * Math.pow(1024, 1),
      size: 10000,
    })
    .onSecondCall()
    .returns({
      free: 2 * Math.pow(1024, 1),
      size: 10000,
    });
  const diskWatermarkService = new DiskWatermarkService(
    diskCheckerStub,
    {
      disk: {
        thresholdEnabled: true,
        watermarkLow: '4kb',
      },
      repoPath: '/',
    } as ServerOptions,
    log
  );

  expect(await diskWatermarkService.isLowWatermark()).toBeFalsy(); // 8kb available
  expect(await diskWatermarkService.isLowWatermark()).toBeTruthy(); // 2kb available
});

test('Disk watermark check in absolute mode in mb', async () => {
  const diskCheckerStub = sinon.stub();
  diskCheckerStub
    .onFirstCall()
    .resolves({
      free: 8 * Math.pow(1024, 2),
      size: 10000,
    })
    .onSecondCall()
    .returns({
      free: 2 * Math.pow(1024, 2),
      size: 10000,
    });
  const diskWatermarkService = new DiskWatermarkService(
    diskCheckerStub,
    {
      disk: {
        thresholdEnabled: true,
        watermarkLow: '4mb',
      },
      repoPath: '/',
    } as ServerOptions,
    log
  );

  expect(await diskWatermarkService.isLowWatermark()).toBeFalsy(); // 8mb available
  expect(await diskWatermarkService.isLowWatermark()).toBeTruthy(); // 2mb available
});

test('Disk watermark check in absolute mode in gb', async () => {
  const diskCheckerStub = sinon.stub();
  diskCheckerStub
    .onFirstCall()
    .resolves({
      free: 8 * Math.pow(1024, 3),
      size: 10000,
    })
    .onSecondCall()
    .returns({
      free: 2 * Math.pow(1024, 3),
      size: 10000,
    });
  const diskWatermarkService = new DiskWatermarkService(
    diskCheckerStub,
    {
      disk: {
        thresholdEnabled: true,
        watermarkLow: '4gb',
      },
      repoPath: '/',
    } as ServerOptions,
    log
  );

  expect(await diskWatermarkService.isLowWatermark()).toBeFalsy(); // 8gb available
  expect(await diskWatermarkService.isLowWatermark()).toBeTruthy(); // 2gb available
});

test('Disk watermark check in absolute mode in tb', async () => {
  const diskCheckerStub = sinon.stub();
  diskCheckerStub
    .onFirstCall()
    .resolves({
      free: 8 * Math.pow(1024, 4),
      size: 10000,
    })
    .onSecondCall()
    .returns({
      free: 2 * Math.pow(1024, 4),
      size: 10000,
    });
  const diskWatermarkService = new DiskWatermarkService(
    diskCheckerStub,
    {
      disk: {
        thresholdEnabled: true,
        watermarkLow: '4tb',
      },
      repoPath: '/',
    } as ServerOptions,
    log
  );

  expect(await diskWatermarkService.isLowWatermark()).toBeFalsy(); // 8tb available
  expect(await diskWatermarkService.isLowWatermark()).toBeTruthy(); // 2tb available
});

test('Disk watermark check in invalid config', async () => {
  const diskCheckerStub = sinon.stub();
  diskCheckerStub
    .onFirstCall()
    .resolves({
      free: 50,
      size: 100,
    })
    .onSecondCall()
    .returns({
      free: 5,
      size: 100,
    });
  const diskWatermarkService = new DiskWatermarkService(
    diskCheckerStub,
    {
      disk: {
        thresholdEnabled: true,
        // invalid config, will fallback with 90% by default
        watermarkLow: '1234',
      },
      repoPath: '/',
    } as ServerOptions,
    log
  );

  expect(await diskWatermarkService.isLowWatermark()).toBeFalsy(); // 50% usage
  expect(await diskWatermarkService.isLowWatermark()).toBeTruthy(); // 95% usage
});
