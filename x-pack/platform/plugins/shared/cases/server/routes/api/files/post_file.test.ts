/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock } from '../../../client/mocks';
import { postFileRoute } from './post_file';

describe('getCaseRoute', () => {
  const casesClientMock = createCasesClientMock();
  const response = { ok: jest.fn() };
  const context = { cases: { getCasesClient: jest.fn().mockResolvedValue(casesClientMock) } };
  const sub = { unsubscribe: jest.fn() };

  afterEach(() => jest.clearAllMocks());

  it('extracts the file metadata from hapi as expected', async () => {
    const request = {
      body: { file: { hapi: { filename: 'foobar.txt' } } },
      events: { aborted$: { subscribe: jest.fn().mockReturnValue(sub) } },
      params: { case_id: 'bar' },
    };

    // @ts-ignore
    await postFileRoute.handler({ context, request, response });

    expect(casesClientMock.attachments.addFile).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'bar',
        file: {
          hapi: {
            filename: 'foobar.txt',
          },
        },
        filename: 'foobar',
        mimeType: 'text/plain',
      })
    );

    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('filename in body takes precedence over metadata', async () => {
    const request = {
      body: { file: { hapi: { filename: 'foobar.txt' } }, filename: 'foo' },
      events: { aborted$: { subscribe: jest.fn().mockReturnValue(sub) } },
      params: { case_id: 'bar' },
    };

    // @ts-ignore
    await postFileRoute.handler({ context, request, response });

    expect(casesClientMock.attachments.addFile).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'bar',
        file: {
          hapi: {
            filename: 'foobar.txt',
          },
        },
        filename: 'foo',
        mimeType: 'text/plain',
      })
    );

    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('unrecognized mimetype will be sent as undefined', async () => {
    const request = {
      body: { file: { hapi: { filename: 'foobar.foobar' } } },
      events: { aborted$: { subscribe: jest.fn().mockReturnValue(sub) } },
      params: { case_id: 'bar' },
    };

    // @ts-ignore
    await postFileRoute.handler({ context, request, response });

    expect(casesClientMock.attachments.addFile).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'bar',
        file: {
          hapi: {
            filename: 'foobar.foobar',
          },
        },
      })
    );

    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('missing hapi will not throw an error', async () => {
    const request = {
      body: { file: {} },
      events: { aborted$: { subscribe: jest.fn().mockReturnValue(sub) } },
      params: { case_id: 'bar' },
    };

    // @ts-ignore
    await postFileRoute.handler({ context, request, response });

    expect(casesClientMock.attachments.addFile).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'bar',
        file: {},
        filename: '',
      })
    );

    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});
