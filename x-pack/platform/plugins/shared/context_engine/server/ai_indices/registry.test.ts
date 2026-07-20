/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AiIndexRegistry } from './registry';
import { AiIndexNotFoundError, InvalidAiIndexDestError } from './errors';
import type { AiIndexService } from './service';
import type { AiIndexProperties } from '../../common/http_api/ai_indices';

const makeProperties = (overrides: Partial<AiIndexProperties> = {}): AiIndexProperties => ({
  name: 'Test Index',
  description: 'A test AI index',
  dest: { type: 'index', value: '.ai-index-idx-test' },
  automations: [],
  sources: [{ type: 'kbn_api', value: '/api/test/{id}' }],
  ...overrides,
});

const makeServiceMock = (overrides: Partial<AiIndexService> = {}): jest.Mocked<AiIndexService> =>
  ({
    get: jest.fn(),
    put: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AiIndexService>);

describe('AiIndexRegistry', () => {
  let registry: AiIndexRegistry;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    registry = new AiIndexRegistry();
    logger = loggingSystemMock.createLogger();
  });

  describe('register()', () => {
    it('buffers a registration before startupRegister is called', async () => {
      const service = makeServiceMock({
        get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('test')),
        put: jest.fn().mockResolvedValue('created'),
      });

      registry.register('test', makeProperties());
      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.put).toHaveBeenCalledWith('test', makeProperties());
    });

    it('throws if called after startupRegister has run', async () => {
      const service = makeServiceMock();
      await registry.startupRegister({ aiIndexService: service, isEnabled: false, logger });

      expect(() => registry.register('test', makeProperties())).toThrow(
        'registerAiIndex called after plugin start'
      );
    });
  });

  describe('startupRegister()', () => {
    it('does nothing when isEnabled is false', async () => {
      const service = makeServiceMock();
      registry.register('test', makeProperties());

      await registry.startupRegister({ aiIndexService: service, isEnabled: false, logger });

      expect(service.get).not.toHaveBeenCalled();
      expect(service.put).not.toHaveBeenCalled();
    });

    it('skips put() when entry already exists', async () => {
      const service = makeServiceMock({
        get: jest.fn().mockResolvedValue({
          id: 'test',
          ...makeProperties(),
          date_created: '',
          date_modified: '',
        }),
      });
      registry.register('test', makeProperties());

      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.put).not.toHaveBeenCalled();
    });

    it('calls put() when entry does not exist', async () => {
      const service = makeServiceMock({
        get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('test')),
        put: jest.fn().mockResolvedValue('created'),
      });
      registry.register('test', makeProperties());

      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.put).toHaveBeenCalledWith('test', makeProperties());
    });

    it('logs a warning and does not throw when put() throws InvalidAiIndexDestError', async () => {
      const service = makeServiceMock({
        get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('test')),
        put: jest.fn().mockRejectedValue(new InvalidAiIndexDestError('dest not ready')),
      });
      registry.register('test', makeProperties());

      await expect(
        registry.startupRegister({ aiIndexService: service, isEnabled: true, logger })
      ).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('dest not ready'));
    });

    it('logs a warning and does not throw when put() throws an unexpected error', async () => {
      const service = makeServiceMock({
        get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('test')),
        put: jest.fn().mockRejectedValue(new Error('ES cluster unavailable')),
      });
      registry.register('test', makeProperties());

      await expect(
        registry.startupRegister({ aiIndexService: service, isEnabled: true, logger })
      ).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ES cluster unavailable'));
    });

    it('registers multiple entries independently', async () => {
      const service = makeServiceMock({
        get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('any')),
        put: jest.fn().mockResolvedValue('created'),
      });
      registry.register('a', makeProperties({ name: 'A' }));
      registry.register('b', makeProperties({ name: 'B' }));

      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.put).toHaveBeenCalledTimes(2);
      expect(service.put).toHaveBeenCalledWith('a', makeProperties({ name: 'A' }));
      expect(service.put).toHaveBeenCalledWith('b', makeProperties({ name: 'B' }));
    });
  });
});
