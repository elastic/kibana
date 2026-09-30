/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { registerAnonymizationTestRoute } from '.';
import { RegexWorkerService } from '../../chat_complete/anonymization/regex_worker_service';
import type { AnonymizationWorkerConfig } from '../../config';

describe('registerAnonymizationTestRoute', () => {
  const disabledWorkerConfig = { enabled: false } as AnonymizationWorkerConfig;
  const logger = loggingSystemMock.createLogger();

  const setup = () => {
    const router = httpServiceMock.createRouter();
    const regexWorker = new RegexWorkerService(disabledWorkerConfig, logger);
    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {
          elasticsearch: {
            client: {
              asScoped: jest.fn().mockReturnValue({ asCurrentUser: {} }),
            },
          },
        },
        {},
        {},
      ]),
    } as any;

    registerAnonymizationTestRoute({
      router,
      coreSetup,
      getRegexWorker: () => regexWorker,
      logger,
    });

    const [, handler] = router.post.mock.calls[0];
    return { handler };
  };

  const callHandler = async (handler: any, body: Record<string, any>) => {
    const request = httpServerMock.createKibanaRequest({ body });
    const response = httpServerMock.createResponseFactory();
    await handler({} as RequestHandlerContext, request, response);
    return response;
  };

  it('masks matching values and returns a breakdown', async () => {
    const { handler } = setup();

    const response = await callHandler(handler, {
      input: { contact: 'a.mehta@example.com', note: 'reach out' },
      rules: [
        {
          type: 'RegExp',
          enabled: true,
          entityClass: 'EMAIL',
          pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        },
      ],
    });

    expect(response.ok).toHaveBeenCalledTimes(1);
    const { body } = (response.ok as jest.Mock).mock.calls[0][0];

    expect(body.maskedInput.contact).toContain('EMAIL_');
    expect(body.maskedInput.note).toBe('reach out');
    expect(body.anonymizations).toEqual([
      expect.objectContaining({ entityType: 'EMAIL', originalValue: 'a.mehta@example.com' }),
    ]);
    expect(body.stats).toEqual({ valuesMasked: 1, uniqueValues: 1, rulesApplied: 1 });
  });

  it('ignores disabled rules', async () => {
    const { handler } = setup();

    const response = await callHandler(handler, {
      input: { contact: 'a.mehta@example.com' },
      rules: [
        {
          type: 'RegExp',
          enabled: false,
          entityClass: 'EMAIL',
          pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        },
      ],
    });

    const { body } = (response.ok as jest.Mock).mock.calls[0][0];
    expect(body.maskedInput.contact).toBe('a.mehta@example.com');
    expect(body.stats).toEqual({ valuesMasked: 0, uniqueValues: 0, rulesApplied: 0 });
  });

  it('returns a 503 when the regex worker is not yet available', async () => {
    const router = httpServiceMock.createRouter();
    const coreSetup = { getStartServices: jest.fn() } as any;

    registerAnonymizationTestRoute({
      router,
      coreSetup,
      getRegexWorker: () => undefined,
      logger,
    });

    const [, handler] = router.post.mock.calls[0];
    const response = await callHandler(handler, { input: {}, rules: [] });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });
});
