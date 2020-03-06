/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../../../server';
import { createMockReportingCore, createMockServer } from '../../../test_helpers';
import { ServerFacade } from '../../../types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';
import { getConditionalHeaders, getCustomLogo } from './index';

let mockReportingPlugin: ReportingCore;
let mockServer: ServerFacade;
beforeEach(async () => {
  mockReportingPlugin = await createMockReportingCore();
  mockServer = createMockServer('');
});

test(`gets logo from uiSettings`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const mockGet = jest.fn();
  mockGet.mockImplementationOnce((...args: any[]) => {
    if (args[0] === 'xpackReporting:customPdfLogo') {
      return 'purple pony';
    }
    throw new Error('wrong caller args!');
  });
  mockReportingPlugin.getUiSettingsServiceFactory = jest.fn().mockResolvedValue({
    get: mockGet,
  });

  const conditionalHeaders = await getConditionalHeaders({
    job: {} as JobDocPayloadPDF,
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  const { logo } = await getCustomLogo({
    reporting: mockReportingPlugin,
    job: {} as JobDocPayloadPDF,
    conditionalHeaders,
    server: mockServer,
  });

  expect(mockGet).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(logo).toBe('purple pony');
});
