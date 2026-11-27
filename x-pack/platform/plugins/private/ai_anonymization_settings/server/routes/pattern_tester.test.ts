/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { DEFAULT_BUILTIN_REGEX_RULES } from '@kbn/ai-anonymization-common';
import { RegexWorkerService } from '@kbn/ai-anonymization-server';
import type { AnonymizationWorkerConfig } from '@kbn/ai-anonymization-server';
import { registerPatternTesterRoute } from './pattern_tester';
import type { PatternTesterRequestHandlerContext } from './pattern_tester';

describe('registerPatternTesterRoute', () => {
  const disabledWorkerConfig = { enabled: false } as AnonymizationWorkerConfig;
  const logger = loggingSystemMock.createLogger();

  const setup = () => {
    const router = httpServiceMock.createRouter();
    const regexWorker = new RegexWorkerService(disabledWorkerConfig, logger);
    // The tester only runs on worker threads; the stubbed `run`/sync execution stands in for them.
    jest.spyOn(regexWorker, 'isEnabled').mockReturnValue(true);
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

    registerPatternTesterRoute({
      router,
      getStartServices: coreSetup.getStartServices,
      getRegexWorker: () => regexWorker,
      logger,
    });

    const [routeConfig, handler] = router.post.mock.calls[0];
    return { handler, routeConfig };
  };

  const callHandler = async (
    handler: any,
    body: Record<string, any>,
    licenseType: 'basic' | 'platinum' | 'enterprise' = 'enterprise'
  ) => {
    const request = httpServerMock.createKibanaRequest({ body });
    const response = httpServerMock.createResponseFactory();
    const licensing = licensingMock.createRequestHandlerContext({
      license: { type: licenseType, mode: licenseType },
    });
    const context = { licensing: Promise.resolve(licensing) } as PatternTesterRequestHandlerContext;
    await handler(context, request, response);
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

  it('masks a plain string input, not only JSON objects', async () => {
    const { handler } = setup();

    const response = await callHandler(handler, {
      input: 'mail a.mehta@example.com about 10.0.0.1',
      rules: [
        {
          type: 'RegExp',
          enabled: true,
          entityClass: 'EMAIL',
          pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        },
      ],
    });

    const { body } = (response.ok as jest.Mock).mock.calls[0][0];
    expect(typeof body.maskedInput).toBe('string');
    expect(body.maskedInput).toMatch(/^mail EMAIL_\w+ about 10\.0\.0\.1$/);
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

  it('refuses to run caller-supplied patterns on the Kibana thread when worker threads are disabled', async () => {
    const router = httpServiceMock.createRouter();
    const regexWorker = new RegexWorkerService(disabledWorkerConfig, logger);
    const runSpy = jest.spyOn(regexWorker, 'run');

    registerPatternTesterRoute({
      router,
      getStartServices: jest.fn() as any,
      getRegexWorker: () => regexWorker,
      logger,
    });

    const [, handler] = router.post.mock.calls[0];
    const response = await callHandler(handler, {
      input: { note: 'aaaa' },
      rules: [{ type: 'RegExp', enabled: true, entityClass: 'MISC', pattern: '(a+)+$' }],
    });

    expect(runSpy).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('returns a 503 when the regex worker is not yet available', async () => {
    const router = httpServiceMock.createRouter();
    const coreSetup = { getStartServices: jest.fn() } as any;

    registerPatternTesterRoute({
      router,
      getStartServices: coreSetup.getStartServices,
      getRegexWorker: () => undefined,
      logger,
    });

    const [, handler] = router.post.mock.calls[0];
    const response = await callHandler(handler, { input: {}, rules: [] });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it.each(['basic', 'platinum'] as const)(
    'refuses a %s license with a 403 before running anything, since AI features need Enterprise',
    async (licenseType) => {
      const { handler } = setup();

      const response = await callHandler(
        handler,
        { input: { a: 'a.mehta@example.com' }, rules: [] },
        licenseType
      );

      expect(response.forbidden).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ message: expect.any(String) }) })
      );
      expect(response.ok).not.toHaveBeenCalled();
    }
  );

  it('requires the privilege needed to edit the setting, since it runs caller-supplied regexes', () => {
    const { routeConfig } = setup();

    expect(routeConfig.security).toEqual({
      authz: { requiredPrivileges: ['manage_advanced_settings'] },
    });
  });

  it('returns a 400 naming the problem when a pattern does not compile, instead of reporting "0 masked"', async () => {
    const { handler } = setup();

    const response = await callHandler(handler, {
      input: { contact: 'a.mehta@example.com' },
      rules: [{ type: 'RegExp', enabled: true, entityClass: 'EMAIL', pattern: '(unclosed' }],
    });

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        body: {
          message: expect.stringMatching(/Pattern test failed:.*invalid regular expression/),
        },
      })
    );
  });

  // A rule saved before custom patterns moved to RE2 can be tested like it runs: on the engine it
  // always used. The editor still requires RE2 syntax for new patterns.
  it('tests a pattern that only the previous engine supports, like the request path runs it', async () => {
    const { handler } = setup();

    const response = await callHandler(handler, {
      input: { contact: 'foobar' },
      rules: [{ type: 'RegExp', enabled: true, entityClass: 'MISC', pattern: 'foo(?=bar)' }],
    });

    expect(response.customError).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
  });

  it('returns a 400 when the pattern exceeds the worker timeout', async () => {
    const { handler } = setup();
    jest
      .spyOn(RegexWorkerService.prototype, 'run')
      .mockRejectedValueOnce(new Error('Anonymization patterns timed out after 15s'));

    const response = await callHandler(handler, {
      input: { contact: 'x' },
      rules: [{ type: 'RegExp', enabled: true, entityClass: 'MISC', pattern: '(a+)+$' }],
    });

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        body: { message: expect.stringContaining('timed out') },
      })
    );
  });

  it('accepts every built-in rule so the settings page can test the patterns it ships', () => {
    const { routeConfig } = setup();
    const bodySchema = (routeConfig.validate as { body: { validate: (value: unknown) => unknown } })
      .body;

    DEFAULT_BUILTIN_REGEX_RULES.forEach((rule) => {
      expect(() => bodySchema.validate({ input: {}, rules: [rule] })).not.toThrow();
    });
  });
});
