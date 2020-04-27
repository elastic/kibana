/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { createMockReportingCore } from '../../../../test_helpers';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { LevelLogger } from '../../../../server/lib';
import { CancellationToken } from '../../../../types';
import { ReportingCore } from '../../../../server';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import { JobDocPayloadPDF } from '../../types';
import { executeJobFactory } from './index';

jest.mock('../lib/generate_pdf', () => ({ generatePdfObservableFactory: jest.fn() }));

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

const mockEncryptionKey = 'testencryptionkey';
const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockEncryptionKey);
  return await crypto.encrypt(headers);
};

const getJobDocPayload = (baseObj: any) => baseObj as JobDocPayloadPDF;

beforeEach(async () => {
  const kbnConfig = {
    'server.basePath': '/sbp',
  };
  const reportingConfig = {
    encryptionKey: mockEncryptionKey,
    'kibanaServer.hostname': 'localhost',
    'kibanaServer.port': 5601,
    'kibanaServer.protocol': 'http',
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

  (generatePdfObservableFactory as jest.Mock).mockReturnValue(jest.fn());
});

afterEach(() => (generatePdfObservableFactory as jest.Mock).mockReset());

test(`passes browserTimezone to generatePdf`, async () => {
  const encryptedHeaders = await encryptHeaders({});
  const generatePdfObservable = (await generatePdfObservableFactory(mockReporting)) as jest.Mock;
  generatePdfObservable.mockReturnValue(Rx.of(Buffer.from('')));

  const executeJob = await executeJobFactory(mockReporting, getMockLogger());
  const browserTimezone = 'UTC';
  await executeJob(
    'pdfJobId',
    getJobDocPayload({
      relativeUrl: '/app/kibana#/something',
      browserTimezone,
      headers: encryptedHeaders,
    }),
    cancellationToken
  );

  expect(generatePdfObservable.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        LevelLogger {
          "_logger": Object {
            "get": [MockFunction],
          },
          "_tags": Array [
            "printable_pdf",
            "execute",
            "pdfJobId",
          ],
          "warning": [Function],
        },
        undefined,
        Array [
          "http://localhost:5601/sbp/app/kibana#/something",
        ],
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
        false,
      ],
    ]
  `);
});

test(`returns content_type of application/pdf`, async () => {
  const logger = getMockLogger();
  const executeJob = await executeJobFactory(mockReporting, logger);
  const encryptedHeaders = await encryptHeaders({});

  const generatePdfObservable = await generatePdfObservableFactory(mockReporting);
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of(Buffer.from('')));

  const { content_type: contentType } = await executeJob(
    'pdfJobId',
    getJobDocPayload({ relativeUrls: [], headers: encryptedHeaders }),
    cancellationToken
  );
  expect(contentType).toBe('application/pdf');
});

test(`returns content of generatePdf getBuffer base64 encoded`, async () => {
  const testContent = 'test content';
  const generatePdfObservable = await generatePdfObservableFactory(mockReporting);
  (generatePdfObservable as jest.Mock).mockReturnValue(Rx.of({ buffer: Buffer.from(testContent) }));

  const executeJob = await executeJobFactory(mockReporting, getMockLogger());
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob(
    'pdfJobId',
    getJobDocPayload({ relativeUrls: [], headers: encryptedHeaders }),
    cancellationToken
  );

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
