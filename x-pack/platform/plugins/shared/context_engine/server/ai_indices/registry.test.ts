/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AiIndexRegistry } from './registry';
import { AiIndexConflictError, AiIndexIdConflictError, InvalidAiIndexDestError } from './errors';
import type { AiIndexService } from './service';
import type { AiIndexProperties } from '../../common/http_api/ai_indices';

const makeProperties = (overrides: Partial<AiIndexProperties> = {}): AiIndexProperties => ({
  description: 'A test AI index',
  dest: { type: 'index', value: 'ai-index-idx-test' },
  automations: [],
  sources: [],
  ...overrides,
});

const makeServiceMock = (overrides: Partial<AiIndexService> = {}): jest.Mocked<AiIndexService> =>
  ({
    get: jest.fn(),
    put: jest.fn(),
    putManaged: jest.fn(),
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
        putManaged: jest.fn().mockResolvedValue('created'),
      });

      registry.register('test', makeProperties());
      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.putManaged).toHaveBeenCalledWith('test', makeProperties());
    });

    it('throws if called after startupRegister has run', async () => {
      const service = makeServiceMock();
      await registry.startupRegister({ aiIndexService: service, isEnabled: false, logger });

      expect(() => registry.register('test', makeProperties())).toThrow(
        'registerAiIndex called after plugin start'
      );
    });

    it('throws if the same id is registered twice', () => {
      registry.register('test', makeProperties());
      expect(() => registry.register('test', makeProperties())).toThrow(
        "AI index 'test' is already registered"
      );
    });
  });

  describe('startupRegister()', () => {
    it('does nothing when isEnabled is false', async () => {
      const service = makeServiceMock();
      registry.register('test', makeProperties());

      await registry.startupRegister({ aiIndexService: service, isEnabled: false, logger });

      expect(service.putManaged).not.toHaveBeenCalled();
    });

    it('calls putManaged() to create a new entry', async () => {
      const service = makeServiceMock({
        putManaged: jest.fn().mockResolvedValue('created'),
      });
      registry.register('test', makeProperties());

      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.putManaged).toHaveBeenCalledWith('test', makeProperties());
    });

    it('refreshes an existing managed entry via putManaged() on every startup', async () => {
      const service = makeServiceMock({
        putManaged: jest.fn().mockResolvedValue('updated'),
      });
      registry.register('test', makeProperties());

      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.putManaged).toHaveBeenCalledWith('test', makeProperties());
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs a warning and does not throw when putManaged() throws InvalidAiIndexDestError', async () => {
      const service = makeServiceMock({
        putManaged: jest.fn().mockRejectedValue(new InvalidAiIndexDestError('dest not ready')),
      });
      registry.register('test', makeProperties());

      await expect(
        registry.startupRegister({ aiIndexService: service, isEnabled: true, logger })
      ).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('dest not ready'));
    });

    it('logs a warning and skips when the id is taken by a user-owned index', async () => {
      const service = makeServiceMock({
        putManaged: jest.fn().mockRejectedValue(new AiIndexIdConflictError('test')),
      });
      registry.register('test', makeProperties());

      await expect(
        registry.startupRegister({ aiIndexService: service, isEnabled: true, logger })
      ).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('user-owned index'));
    });

    it('treats a concurrent registration (AiIndexConflictError) as benign', async () => {
      const service = makeServiceMock({
        putManaged: jest.fn().mockRejectedValue(new AiIndexConflictError('test')),
      });
      registry.register('test', makeProperties());

      await expect(
        registry.startupRegister({ aiIndexService: service, isEnabled: true, logger })
      ).resolves.not.toThrow();

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs a warning and does not throw when putManaged() throws an unexpected error', async () => {
      const service = makeServiceMock({
        putManaged: jest.fn().mockRejectedValue(new Error('ES cluster unavailable')),
      });
      registry.register('test', makeProperties());

      await expect(
        registry.startupRegister({ aiIndexService: service, isEnabled: true, logger })
      ).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ES cluster unavailable'));
    });

    it('registers multiple entries independently', async () => {
      const service = makeServiceMock({
        putManaged: jest.fn().mockResolvedValue('created'),
      });
      registry.register('a', makeProperties({ description: 'A' }));
      registry.register('b', makeProperties({ description: 'B' }));

      await registry.startupRegister({ aiIndexService: service, isEnabled: true, logger });

      expect(service.putManaged).toHaveBeenCalledTimes(2);
      expect(service.putManaged).toHaveBeenCalledWith('a', makeProperties({ description: 'A' }));
      expect(service.putManaged).toHaveBeenCalledWith('b', makeProperties({ description: 'B' }));
    });
  });
});
