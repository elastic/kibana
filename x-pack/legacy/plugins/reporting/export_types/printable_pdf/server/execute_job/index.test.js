/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { memoize } from 'lodash';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { executeJobFactory } from './index';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import { LevelLogger } from '../../../../server/lib';

jest.mock('../lib/generate_pdf', () => ({ generatePdfObservableFactory: jest.fn() }));

const cancellationToken = {
  on: jest.fn(),
};

let config;
let mockServer;
beforeEach(() => {
  config = {
    'xpack.reporting.encryptionKey': 'testencryptionkey',
    'server.basePath': '/sbp',
    'server.host': 'localhost',
    'server.port': 5601,
  };
  mockServer = {
    expose: () => {},
    config: memoize(() => ({ get: jest.fn() })),
    info: {
      protocol: 'http',
    },
    plugins: {
      elasticsearch: {
        getCluster: memoize(() => {
          return {
            callWithRequest: jest.fn(),
          };
        }),
      },
    },
    savedObjects: {
      getScopedSavedObjectsClient: jest.fn(),
    },
    uiSettingsServiceFactory: jest.fn().mockReturnValue({ get: jest.fn() }),
  };

  mockServer.config().get.mockImplementation(key => {
    return config[key];
  });

  generatePdfObservableFactory.mockReturnValue(jest.fn());
});

afterEach(() => generatePdfObservableFactory.mockReset());

const encryptHeaders = async headers => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = executeJobFactory(mockServer);
  const browserTimezone = 'UTC';
  await executeJob(
    'pdfJobId',
    { objects: [], browserTimezone, headers: encryptedHeaders },
    cancellationToken
  );

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(generatePdfObservable).toBeCalledWith(
    expect.any(LevelLogger),
    undefined,
    [],
    browserTimezone,
    expect.anything(),
    undefined,
    undefined
  );
});

test(`returns content_type of application/pdf`, async () => {
  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob(
    'pdfJobId',
    { objects: [], timeRange: {}, headers: encryptedHeaders },
    cancellationToken
  );
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';

  const generatePdfObservable = generatePdfObservableFactory();
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from(testContent)));

  const executeJob = executeJobFactory(mockServer);
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob(
    'pdfJobId',
    { objects: [], timeRange: {}, headers: encryptedHeaders },
    cancellationToken
  );

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
