/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../lib/generate_pdf', () => ({ generatePdfObservableFactory: jest.fn() }));

import * as Rx from 'rxjs';
import { CancellationToken } from '../../../../../../../plugins/reporting/common';
import { ReportingCore } from '../../../../server';
import { cryptoFactory } from '../../../../server/lib';
import { createMockReportingCore } from '../../../../test_helpers';
import { JobDocPayloadPDF } from '../../types';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import { executeJobFactory } from './index';

let mockReporting: ReportingCore;

const cancellationToken = ({
  on: jest.fn(),
} as unknown) as CancellationToken;

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
    index: '.reports-test',
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

  const executeJob = await executeJobFactory(mockReporting);
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

  // Don't snapshot logger
  const [, ...rest] = generatePdfObservable.mock.calls[0];

  expect(rest).toMatchInlineSnapshot(`
    Array [
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
    ]
  `);
});

test(`returns content_type of application/pdf`, async () => {
  const executeJob = await executeJobFactory(mockReporting);
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

  const executeJob = await executeJobFactory(mockReporting);
  const encryptedHeaders = await encryptHeaders({});
  const { content } = await executeJob(
    'pdfJobId',
    getJobDocPayload({ relativeUrls: [], headers: encryptedHeaders }),
    cancellationToken
  );

  expect(content).toEqual(Buffer.from(testContent).toString('base64'));
});
