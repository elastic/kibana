/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { CancellationToken } from '../../../../common/cancellation_token';
import { ReportingCore } from '../../../../server';
import { LevelLogger } from '../../../../server/lib';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { createMockReportingCore } from '../../../../test_helpers';
import { JobDocPayloadPNG } from '../../types';
import { generatePngObservableFactory } from '../lib/generate_png';
import { executeJobFactory } from './index';

jest.mock('../lib/generate_png', () => ({ generatePngObservableFactory: jest.fn() }));

let mockReporting: ReportingCore;

const cancellationToken = ({
  on: jest.fn(),
} as unknown) as CancellationToken;

const mockLoggerFactory = {
  get: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
};
const getMockLogger = () => new LevelLogger(mockLoggerFactory);

const mockEncryptionKey = 'abcabcsecuresecret';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getJobDocPayload = (baseObj: any) => baseObj as JobDocPayloadPNG;

beforeEach(async () => {
  const kbnConfig = {
    'server.basePath': '/sbp',
  };
  const reportingConfig = {
    index: '.reporting-2018.10.10',
    encryptionKey: mockEncryptionKey,
    'kibanaServer.hostname': 'localhost',
    'kibanaServer.port': 5601,
    'kibanaServer.protocol': 'http',
    'queue.indexInterval': 'daily',
    'queue.timeout': Infinity,
  };
  const mockReportingConfig = {
    get: (...keys: string[]) => (reportingConfig as any)[keys.join('.')],
    kbnConfig: { get: (...keys: string[]) => (kbnConfig as any)[keys.join('.')] },
  };

  mockReporting = await createMockReportingCore(mockReportingConfig);

  const mockElasticsearch = {
    dataClient: {
      asScoped: () => ({ callAsCurrentUser: jest.fn() }),
    },
  };
  const mockGetElasticsearch = jest.fn();
  mockGetElasticsearch.mockImplementation(() => Promise.resolve(mockElasticsearch));
  mockReporting.getElasticsearchService = mockGetElasticsearch;

  (generatePngObservableFactory as jest.Mock).mockReturnValue(jest.fn());
});

afterEach(() => (generatePngObservableFactory as jest.Mock).mockReset());

test(`passes browserTimezone to generatePng`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  const generatePngObservable = (await generatePngObservableFactory(mockReporting)) as jest.Mock;
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = await executeJobFactory(mockReporting, getMockLogger());
  const browserTimezone = 'UTC';
  await executeJob(
    'pngJobId',
    getJobDocPayload({
      relativeUrl: '/app/kibana#/something',
      browserTimezone,
      headers: encryptedHeaders,
    }),
    cancellationToken
  );

  expect(generatePngObservable.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        LevelLogger {
          "_logger": Object {
            "get": [MockFunction],
          },
          "_tags": Array [
            "PNG",
            "execute",
            "pngJobId",
          ],
          "warning": [Function],
        },
        "http://localhost:5601/sbp/app/kibana#/something",
        "UTC",
        Object {
          "conditions": Object {
            "basePath": "/sbp",
            "hostname": "localhost",
            "port": 5601,
            "protocol": "http",
          },
          "headers": Object {},
        },
        undefined,
      ],
    ]
  `);
});

test(`returns content_type of application/png`, async () => {
  const executeJob = await executeJobFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});

  const generatePngObservable = (await generatePngObservableFactory(mockReporting)) as jest.Mock;
  generatePngObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob(
    'pngJobId',
    getJobDocPayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken
  );
  expect(contentType).toBe('image/png');
});

test(`returns content of generatePng getBuffer base64 encoded`, async () => {
  const testContent = 'test content';

  const generatePngObservable = (await generatePngObservableFactory(mockReporting)) as jest.Mock;
  generatePngObservable.mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const executeJob = await executeJobFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob(
    'pngJobId',
    getJobDocPayload({ relativeUrl: '/app/kibana#/something', headers: encryptedHeaders }),
    cancellationToken
  );

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
