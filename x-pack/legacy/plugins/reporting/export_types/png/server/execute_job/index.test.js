/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { memoize } from 'lodash';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { executeJobFactory } from './index';
import { generatePngObservableFactory } from '../lib/generate_png';
import { LevelLogger } from '../../../../server/lib';

jest.mock('../lib/generate_png', () => ({ generatePngObservableFactory: jest.fn() }));

const cancellationToken = {
  on: jest.fn()
};

let config;
let mockServer;
beforeEach(() => {
  config = {
    'xpack.reporting.encryptionKey': 'testencryptionkey',
    'server.basePath': '/sbp',
    'server.host': 'localhost',
    'server.port': 5601
  };
  mockServer = {
    expose: () => { }, // NOTE: this is for oncePerServer
    config: memoize(() => ({ get: jest.fn() })),
    info: {
      protocol: 'http',
    },
    plugins: {
      elasticsearch: {
        getCluster: memoize(() => {
          return {
            callWithRequest: jest.fn()
          };
        })
      }
    },
    savedObjects: {
      getScopedSavedObjectsClient: jest.fn(),
    },
    uiSettingsServiceFactory: jest.fn().mockReturnValue({ get: jest.fn() }),
    log: jest.fn(),
  };

  mockServer.config().get.mockImplementation((key) => {
    return config[key];
  });

  generatePngObservableFactory.mockReturnValue(jest.fn());
});

afterEach(() => generatePngObservableFactory.mockReset());

const encryptHeaders = async (headers) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer, { browserDriverFactory: {} });
  const browserTimezone = 'UTC';
  await executeJob('pngJobId', { relativeUrl: '/app/kibana#/something', browserTimezone, headers: encryptedHeaders }, cancellationToken);

  expect(generatePngObservable).toBeCalledWith(expect.any(LevelLogger), 'http://localhost:5601/sbp/app/kibana#/something', browserTimezone, expect.anything(), undefined);
});

test(`returns content_type of application/png`, async () => {
  const executeJob = executeJobFactory(mockServer, { browserDriverFactory: {} });
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob('pngJobId', { relativeUrl: '/app/kibana#/something',
    timeRange: {}, headers: encryptedHeaders }, cancellationToken);
  expect(contentType).toBe('image/png');
});

test(`returns content of generatePng getBuffer base64 encoded`, async () => {
  const testContent = 'test content';

  const generatePngObservable = generatePngObservableFactory();
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from(testContent)));

  const executeJob = executeJobFactory(mockServer, { browserDriverFactory: {} });
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob('pngJobId', { relativeUrl: '/app/kibana#/something',
    timeRange: {}, headers: encryptedHeaders }, cancellationToken);

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
