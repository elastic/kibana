/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
  CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { CheckPrivilegesPayload } from '@kbn/security-plugin/server';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError, AiIndexWriteForbiddenError } from '../ai_indices/errors';
import { BackgroundWriteTracker } from '../session_memory/background_write_tracker';
import type { SessionEventsService } from '../session_events/types';
import type { SessionMemoryService } from '../session_memory/types';
import type { SessionMemoryClientDeps } from './client';
import { createSessionMemoryClient } from './client';
import {
  ContextEngineDisabledError,
  MemoryDisabledError,
  MemoryForbiddenError,
  RememberCapacityError,
  SessionMemoryNotFoundError,
} from './errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const actionOf = (privilege: string) => `api:${privilege}`;

const aiIndex = (id: string) => ({ id, dest: { type: 'data_stream', value: `ai-index-ds-${id}` } });

const userEvent = {
  id: 'evt-1',
  turn_id: 'turn-1',
  event_at: '2026-11-16T09:58:00.000Z',
  type: 'user' as const,
  content: 'Why is checkout slow?',
};

describe('session memory client', () => {
  let settings: Record<string, boolean>;
  let callerUserId: string | null;
  let grantedPrivileges: Set<string>;
  let notWritableDests: Set<string>;
  let getCurrentProfileId: jest.Mock<Promise<string | null>>;
  let checkPrivileges: jest.Mock;
  let aiIndexService: { get: jest.Mock };
  let sessionEvents: jest.Mocked<Pick<SessionEventsService, 'saveEvents'>>;
  let sessionMemory: jest.Mocked<Pick<SessionMemoryService, 'get' | 'remember' | 'forget'>>;
  let backgroundWrites: BackgroundWriteTracker;
  let logger: ReturnType<typeof loggerMock.create>;
  let auditLog: jest.Mock;

  const createClient = () => {
    const uiSettingsClient = {
      get: jest.fn(async (key: string) => {
        if (!(key in settings)) {
          throw new Error(`failed to read ${key}`);
        }
        return settings[key];
      }),
    };
    const deps = {
      core: {
        savedObjects: { getScopedClient: jest.fn(() => ({})) },
        uiSettings: {
          asScopedToClient: jest.fn(() => uiSettingsClient),
          globalAsScopedToClient: jest.fn(() => uiSettingsClient),
        },
        userProfile: { getCurrentProfileId },
        security: { audit: { asScoped: jest.fn(() => ({ log: auditLog })) } },
      },
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn(() => checkPrivileges),
        actions: { api: { get: actionOf } },
      },
      spaces: { spacesService: { getSpaceId: () => 'marketing' } },
      aiIndexService,
      sessionEvents,
      sessionMemory,
      backgroundWrites,
      logger,
    } as unknown as SessionMemoryClientDeps;
    return createSessionMemoryClient(deps, httpServerMock.createKibanaRequest());
  };

  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);
  const savedScope = () => sessionEvents.saveEvents.mock.calls[0][0];
  const savedInput = () => sessionEvents.saveEvents.mock.calls[0][1];

  beforeEach(() => {
    settings = {
      [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true,
      [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
    };
    callerUserId = 'jdoe';
    grantedPrivileges = new Set([actionOf(apiPrivileges.writeContextEngine)]);
    notWritableDests = new Set();
    getCurrentProfileId = jest.fn(async () => callerUserId);
    checkPrivileges = jest.fn(async (payload: CheckPrivilegesPayload) => ({
      hasAllRequested: false,
      username: 'jdoe',
      privileges: {
        kibana: [payload.kibana ?? []].flat().map((privilege) => ({
          privilege,
          authorized: grantedPrivileges.has(privilege),
        })),
        elasticsearch: {
          cluster: [],
          index: Object.fromEntries(
            Object.keys(payload.elasticsearch?.index ?? {}).map((name) => [
              name,
              [{ privilege: 'write', authorized: !notWritableDests.has(name) }],
            ])
          ),
        },
      },
    }));
    aiIndexService = { get: jest.fn(async (id: string) => aiIndex(id)) };
    sessionEvents = {
      saveEvents: jest.fn(async (_scope, { events }) => ({
        results: events.map(({ id }) => ({ id, status: 'created' as const })),
      })),
    };
    sessionMemory = {
      get: jest.fn(async ({ userId }, id) => ({
        id,
        sessionId: 's1',
        userId,
        aiIndexIds: [],
        content: 'existing',
        attributes: {},
        revisedAt: '2026-11-08T09:00:00.000Z',
      })),
      remember: jest.fn(async (_scope, { id }) => ({ id: id ?? 'unused' })),
      forget: jest.fn(),
    };
    logger = loggerMock.create();
    backgroundWrites = new BackgroundWriteTracker({ logger });
    auditLog = jest.fn();
  });

  describe('saveEvents', () => {
    const save = (input: Partial<Parameters<ReturnType<typeof createClient>['saveEvents']>[0]>) =>
      createClient().saveEvents({ sessionId: 's1', events: [userEvent], ...input });

    it('throws and audits nothing while Context Engine is turned off in the space', async () => {
      settings[CONTEXT_ENGINE_ENABLED_SETTING_ID] = false;

      await expect(save({})).rejects.toThrow(ContextEngineDisabledError);
      expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('reports Context Engine as off without reading the memory setting', async () => {
      settings = { [CONTEXT_ENGINE_ENABLED_SETTING_ID]: false };

      await expect(save({})).rejects.toThrow(ContextEngineDisabledError);
    });

    it('throws and audits nothing while memory is turned off', async () => {
      settings[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID] = false;

      await expect(save({})).rejects.toThrow(MemoryDisabledError);
      expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('saves for the caller in the request space with deduplicated AI indices and returns the results', async () => {
      const response = await save({ aiIndexIds: ['ops', 'sales', 'ops'] });

      expect(savedScope()).toEqual({ space: 'marketing', userId: 'jdoe' });
      expect(savedInput()).toEqual({
        sessionId: 's1',
        aiIndexIds: ['ops', 'sales'],
        events: [userEvent],
      });
      expect(response).toEqual({ results: [{ id: 'evt-1', status: 'created' }] });
    });

    it('checks the Kibana privileges, then write on every backing index', async () => {
      await save({ aiIndexIds: ['ops', 'sales'] });

      expect(aiIndexService.get.mock.calls).toEqual([
        ['ops', 'marketing'],
        ['sales', 'marketing'],
      ]);
      expect(checkPrivileges.mock.calls).toEqual([
        [
          {
            kibana: [
              actionOf(apiPrivileges.writeContextEngine),
              actionOf(apiPrivileges.manageMemory),
            ],
          },
        ],
        [
          {
            elasticsearch: {
              cluster: [],
              index: { 'ai-index-ds-ops': ['write'], 'ai-index-ds-sales': ['write'] },
            },
          },
        ],
      ]);
    });

    it('throws Forbidden and audits it when the caller lacks the write privilege', async () => {
      grantedPrivileges.clear();

      await expect(save({})).rejects.toThrow(
        new MemoryForbiddenError(
          `Writing session memory requires the [${apiPrivileges.writeContextEngine}] privilege.`
        )
      );
      expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
          error: expect.objectContaining({ code: 'Forbidden' }),
        }),
      ]);
    });

    describe('target user', () => {
      it('is the caller when userId is left out', async () => {
        await save({});

        expect(savedScope()).toEqual({ space: 'marketing', userId: 'jdoe' });
      });

      it('is the named user with manage memory, without looking up the caller', async () => {
        grantedPrivileges.add(actionOf(apiPrivileges.manageMemory));

        await save({ userId: 'u_other' });

        expect(savedScope()).toEqual({ space: 'marketing', userId: 'u_other' });
        expect(getCurrentProfileId).not.toHaveBeenCalled();
      });

      it('is the caller naming itself, without manage memory', async () => {
        await save({ userId: 'jdoe' });

        expect(savedScope()).toEqual({ space: 'marketing', userId: 'jdoe' });
      });

      it('is the named user when the caller has no profile, with manage memory', async () => {
        callerUserId = null;
        grantedPrivileges.add(actionOf(apiPrivileges.manageMemory));

        await save({ userId: 'u_someone' });

        expect(savedScope()).toEqual({ space: 'marketing', userId: 'u_someone' });
      });

      it('throws Forbidden for a caller without a profile and without userId', async () => {
        callerUserId = null;

        await expect(save({})).rejects.toThrow('The caller has no user profile');
        expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
            error: expect.objectContaining({ code: 'Forbidden' }),
          }),
        ]);
        expect(auditedEvents()[0]).not.toHaveProperty('user');
      });

      it('throws Forbidden and audits the target when naming another user without manage memory', async () => {
        await expect(save({ userId: 'u_other' })).rejects.toThrow(apiPrivileges.manageMemory);
        expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
            error: expect.objectContaining({ code: 'Forbidden' }),
            user: { target: { id: 'u_other' } },
          }),
        ]);
      });

      it('audits and rethrows when looking up the caller fails', async () => {
        getCurrentProfileId.mockRejectedValueOnce(new Error('profile activation failed'));

        await expect(save({})).rejects.toThrow('profile activation failed');
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
            error: { code: 'Error', message: 'profile activation failed' },
          }),
        ]);
      });
    });

    describe('AI indices', () => {
      it('throws AiIndexNotFoundError and audits it when an AI index does not exist', async () => {
        aiIndexService.get.mockRejectedValueOnce(new AiIndexNotFoundError('missing'));

        await expect(save({ aiIndexIds: ['missing'] })).rejects.toThrow(AiIndexNotFoundError);
        expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
            error: expect.objectContaining({ code: 'AiIndexNotFoundError' }),
            user: { target: { id: 'jdoe' } },
          }),
        ]);
      });

      it('throws AiIndexWriteForbiddenError when the caller cannot write one backing index', async () => {
        notWritableDests.add('ai-index-ds-sales');

        await expect(save({ aiIndexIds: ['ops', 'sales'] })).rejects.toThrow(
          new AiIndexWriteForbiddenError('sales')
        );
        expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
      });

      it('reports a missing AI index before an unwritable one', async () => {
        notWritableDests.add('ai-index-ds-ops');
        aiIndexService.get.mockImplementation(async (id: string) => {
          if (id === 'missing') {
            throw new AiIndexNotFoundError(id);
          }
          return aiIndex(id);
        });

        await expect(save({ aiIndexIds: ['ops', 'missing'] })).rejects.toThrow(
          AiIndexNotFoundError
        );
      });

      it('does not look up AI indices for a caller it rejects, since that can create one', async () => {
        callerUserId = null;

        await expect(save({ aiIndexIds: ['ops'] })).rejects.toThrow(MemoryForbiddenError);
        expect(aiIndexService.get).not.toHaveBeenCalled();
      });

      it('audits and rethrows unexpected errors while checking privileges', async () => {
        checkPrivileges.mockRejectedValueOnce(new Error('es unreachable'));

        await expect(save({ aiIndexIds: ['ops'] })).rejects.toThrow('es unreachable');
        expect(sessionEvents.saveEvents).not.toHaveBeenCalled();
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            error: { code: 'Error', message: 'es unreachable' },
          }),
        ]);
      });

      it('checks no backing index when no AI index is named', async () => {
        await save({});

        expect(aiIndexService.get).not.toHaveBeenCalled();
        expect(checkPrivileges).toHaveBeenCalledTimes(1);
        expect(savedInput()).toMatchObject({ aiIndexIds: [] });
      });
    });

    describe('audit', () => {
      it('writes one event per call with the target user and the counts', async () => {
        sessionEvents.saveEvents.mockResolvedValueOnce({
          results: [
            { id: 'evt-1', status: 'created' },
            { id: 'evt-2', status: 'failed', error: 'inference failed' },
          ],
        });

        await save({});

        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            message: 'User has saved 1 event(s) of session [id=s1], 1 failed',
            event: expect.objectContaining({ action: 'memory_save_event', outcome: 'success' }),
            user: { target: { id: 'jdoe' } },
            kibana: { saved_object: { type: 'session_events', id: 's1' } },
          }),
        ]);
      });

      it('records failure when every event failed', async () => {
        sessionEvents.saveEvents.mockResolvedValueOnce({
          results: [{ id: 'evt-1', status: 'failed', error: 'inference failed' }],
        });

        await save({});

        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            message: 'Failed to save 1 event(s) of session [id=s1]',
            event: expect.objectContaining({ outcome: 'failure' }),
          }),
        ]);
      });

      it('records a failed write and rethrows it unchanged', async () => {
        const tooManyRequests = new errors.ResponseError(
          elasticsearchClientMock.createApiResponse({ statusCode: 429, body: {} })
        );
        sessionEvents.saveEvents.mockRejectedValueOnce(tooManyRequests);

        await expect(save({})).rejects.toBe(tooManyRequests);
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_save_event', outcome: 'failure' }),
          }),
        ]);
      });
    });
  });

  describe('remember', () => {
    const input = {
      sessionId: 's1',
      content: 'Root cause is a connection pool limit.',
      attributes: { incident: 'INC-4211' },
    };
    const remember = (overrides: Record<string, unknown> = {}) =>
      createClient().remember({ ...input, ...overrides });
    const remembered = () => sessionMemory.remember.mock.calls[0];

    it('remembers in the background under a generated id with deduplicated AI indices', async () => {
      const { id } = await remember({ aiIndexIds: ['ops-memory', 'ops-memory'] });

      expect(id).toMatch(UUID_PATTERN);
      expect(remembered()).toEqual([
        { space: 'marketing', userId: 'jdoe' },
        {
          id,
          sessionId: 's1',
          content: input.content,
          aiIndexIds: ['ops-memory'],
          attributes: input.attributes,
        },
      ]);
    });

    it('revises an existing memory and returns its id', async () => {
      await expect(remember({ id: 'm1' })).resolves.toEqual({ id: 'm1' });

      expect(sessionMemory.get).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, 'm1');
      expect(remembered()[1]).toMatchObject({ id: 'm1' });
    });

    it('does not look up the memory when no id is given', async () => {
      await remember();

      expect(sessionMemory.get).not.toHaveBeenCalled();
    });

    it('throws and audits nothing while memory is turned off', async () => {
      settings[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID] = false;

      await expect(remember()).rejects.toThrow(MemoryDisabledError);
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('throws SessionMemoryNotFoundError and audits it when revising a missing id', async () => {
      sessionMemory.get.mockResolvedValueOnce(undefined);

      await expect(remember({ id: 'missing-id' })).rejects.toThrow(SessionMemoryNotFoundError);
      expect(sessionMemory.remember).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'memory_remember',
            type: ['change'],
            outcome: 'failure',
          }),
          error: { code: 'NotFound', message: "Session memory 'missing-id' not found" },
          user: { target: { id: 'jdoe' } },
          kibana: { saved_object: { type: 'session_memory', id: 'missing-id' } },
        }),
      ]);
    });

    it('audits and rethrows when looking up a revision fails', async () => {
      sessionMemory.get.mockRejectedValueOnce(new Error('search failed'));

      await expect(remember({ id: 'm1' })).rejects.toThrow('search failed');
      expect(auditedEvents()).toEqual([
        expect.objectContaining({ error: { code: 'Error', message: 'search failed' } }),
      ]);
    });

    it('audits a rejected caller without a user, keeping the memory id', async () => {
      callerUserId = null;

      await expect(remember({ id: 'm1' })).rejects.toThrow(MemoryForbiddenError);
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ type: ['change'], outcome: 'failure' }),
          error: expect.objectContaining({ code: 'Forbidden' }),
          kibana: { saved_object: { type: 'session_memory', id: 'm1' } },
        }),
      ]);
      expect(auditedEvents()[0]).not.toHaveProperty('user');
    });

    it('audits a missing AI index without a memory id when none was given', async () => {
      aiIndexService.get.mockRejectedValueOnce(new AiIndexNotFoundError('ops-memory'));

      await expect(remember({ aiIndexIds: ['ops-memory'] })).rejects.toThrow(AiIndexNotFoundError);
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'Failed attempt to remember session memory of session [id=s1]',
          user: { target: { id: 'jdoe' } },
        }),
      ]);
      expect(auditedEvents()[0]).not.toHaveProperty('kibana');
    });

    describe('audit of the write', () => {
      let finishWrite: () => void;

      beforeEach(() => {
        sessionMemory.remember.mockReturnValueOnce(
          new Promise((resolve) => {
            finishWrite = () => resolve({ id: 'unused' });
          })
        );
      });

      it('writes the success event only once the write has finished', async () => {
        const { id } = await remember();
        await flushPromises();

        expect(auditLog).not.toHaveBeenCalled();

        finishWrite();
        await flushPromises();

        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            message: `User has remembered session memory [id=${id}] of session [id=s1]`,
            event: expect.objectContaining({
              action: 'memory_remember',
              type: ['creation'],
              outcome: 'success',
            }),
            user: { target: { id: 'jdoe' } },
            kibana: { saved_object: { type: 'session_memory', id } },
          }),
        ]);
      });

      it('records a revision as a change', async () => {
        await remember({ id: 'm1' });
        finishWrite();
        await flushPromises();

        expect(auditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({ type: ['change'], outcome: 'success' }),
            kibana: { saved_object: { type: 'session_memory', id: 'm1' } },
          })
        );
      });
    });

    describe('a failed write', () => {
      const rememberAndSettle = async () => {
        const unhandled = jest.fn();
        process.on('unhandledRejection', unhandled);
        try {
          const { id } = await remember();
          await flushPromises();
          return { id, unhandled };
        } finally {
          process.off('unhandledRejection', unhandled);
        }
      };

      it('logs only the error name with the memory id, audits it, and leaves no unhandled rejection', async () => {
        sessionMemory.remember.mockRejectedValueOnce(
          Object.assign(new Error('contains secret memory content'), { name: 'TimeoutError' })
        );

        const { id, unhandled } = await rememberAndSettle();

        expect(unhandled).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to remember session memory [id=${id}]: TimeoutError`
        );
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            message: `Failed attempt to remember session memory [id=${id}] of session [id=s1]`,
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'TimeoutError', message: 'TimeoutError' },
          }),
        ]);
      });

      it('logs a ResponseError status without its reason or body', async () => {
        sessionMemory.remember.mockRejectedValueOnce(
          new errors.ResponseError(
            elasticsearchClientMock.createApiResponse({
              statusCode: 400,
              body: {
                error: {
                  type: 'mapper_parsing_exception',
                  reason: "Preview of field's value: 'top-secret memory content'",
                },
              },
            })
          )
        );

        const { id } = await rememberAndSettle();

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to remember session memory [id=${id}]: ResponseError (status 400)`
        );
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            error: { code: 'ResponseError', message: 'ResponseError (status 400)' },
          }),
        ]);
      });

      it('logs and audits a non-Error rejection without the rejected value', async () => {
        sessionMemory.remember.mockRejectedValueOnce('raw rejection with secret content');

        const { id, unhandled } = await rememberAndSettle();

        expect(unhandled).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to remember session memory [id=${id}]: Error`
        );
        expect(auditedEvents()).toEqual([
          expect.objectContaining({ error: { code: 'Error', message: 'Error' } }),
        ]);
      });
    });

    describe('backpressure and shutdown', () => {
      it('throws RememberCapacityError and audits it while at the in-flight limit', async () => {
        backgroundWrites = new BackgroundWriteTracker({ maxInFlight: 1, logger });
        let finishFirst!: () => void;
        sessionMemory.remember.mockReturnValueOnce(
          new Promise((resolve) => {
            finishFirst = () => resolve({ id: 'm1' });
          })
        );

        await remember({ id: 'm1' });
        await expect(remember({ id: 'm2' })).rejects.toThrow(RememberCapacityError);

        expect(sessionMemory.remember).toHaveBeenCalledTimes(1);
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: expect.objectContaining({ code: 'TooManyRequests' }),
            user: { target: { id: 'jdoe' } },
            kibana: { saved_object: { type: 'session_memory', id: 'm2' } },
          }),
        ]);

        finishFirst();
        await flushPromises();

        await expect(remember({ id: 'm3' })).resolves.toEqual({ id: 'm3' });
      });

      it('throws RememberCapacityError while draining on shutdown', async () => {
        let finishPending!: () => void;
        sessionMemory.remember.mockReturnValueOnce(
          new Promise((resolve) => {
            finishPending = () => resolve({ id: 'm1' });
          })
        );

        await remember({ id: 'm1' });
        const drainPromise = backgroundWrites.drain();

        await expect(remember()).rejects.toThrow(RememberCapacityError);
        expect(sessionMemory.remember).toHaveBeenCalledTimes(1);
        expect(auditedEvents()[0]).not.toHaveProperty('kibana');

        finishPending();
        await drainPromise;
      });
    });
  });

  describe('forget', () => {
    const forget = (input: { userId?: string; ids: string[] }) => createClient().forget(input);

    it('throws and audits nothing while Context Engine is turned off in the space', async () => {
      settings[CONTEXT_ENGINE_ENABLED_SETTING_ID] = false;

      await expect(forget({ ids: ['m1'] })).rejects.toThrow(ContextEngineDisabledError);
      expect(sessionMemory.forget).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('still forgets while memory is turned off', async () => {
      settings[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID] = false;
      sessionMemory.forget.mockResolvedValue([{ id: 'a', outcome: 'forgotten' }]);

      await expect(forget({ ids: ['a'] })).resolves.toEqual([{ id: 'a', outcome: 'forgotten' }]);
      expect(sessionMemory.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, [
        'a',
      ]);
    });

    it('forgets each unique id and audits each once, recording not_found and failed as failures', async () => {
      const results = [
        { id: 'a', outcome: 'forgotten' as const },
        { id: 'b', outcome: 'already_forgotten' as const },
        { id: 'c', outcome: 'not_found' as const },
        { id: 'd', outcome: 'failed' as const, error: 'tombstone rejected' },
      ];
      sessionMemory.forget.mockResolvedValue(results);

      await expect(forget({ userId: 'jdoe', ids: ['a', 'b', 'c', 'd', 'a'] })).resolves.toEqual(
        results
      );

      expect(sessionMemory.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, [
        'a',
        'b',
        'c',
        'd',
      ]);
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'User has forgotten session memory [id=a] of user [id=jdoe]',
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'success' }),
          user: { target: { id: 'jdoe' } },
        }),
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'success' }),
          kibana: { saved_object: { type: 'session_memory', id: 'b' } },
        }),
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          error: expect.objectContaining({ code: 'not_found' }),
        }),
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          error: { code: 'failed', message: 'tombstone rejected' },
        }),
      ]);
    });

    it('forgets for another user with manage memory, even when the caller has no profile', async () => {
      callerUserId = null;
      grantedPrivileges.add(actionOf(apiPrivileges.manageMemory));
      sessionMemory.forget.mockResolvedValue([{ id: 'a', outcome: 'forgotten' }]);

      await forget({ userId: 'other', ids: ['a'] });

      expect(sessionMemory.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'other' }, [
        'a',
      ]);
    });

    it('throws Forbidden and audits every unique id for a caller without a profile', async () => {
      callerUserId = null;

      await expect(forget({ ids: ['a', 'b', 'a'] })).rejects.toThrow(
        'The caller has no user profile'
      );
      expect(sessionMemory.forget).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'Failed attempt to forget session memory [id=a]',
          error: expect.objectContaining({ code: 'Forbidden' }),
        }),
        expect.objectContaining({
          message: 'Failed attempt to forget session memory [id=b]',
          error: expect.objectContaining({ code: 'Forbidden' }),
        }),
      ]);
    });

    it('throws Forbidden and audits the target when naming another user without manage memory', async () => {
      await expect(forget({ userId: 'other', ids: ['a'] })).rejects.toThrow(
        apiPrivileges.manageMemory
      );
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          error: expect.objectContaining({ code: 'Forbidden' }),
          user: { target: { id: 'other' } },
        }),
      ]);
    });

    it('audits a failure for every id and rethrows when the service throws', async () => {
      const error = new Error('shard unavailable');
      sessionMemory.forget.mockRejectedValue(error);

      await expect(forget({ userId: 'jdoe', ids: ['a', 'b', 'a'] })).rejects.toBe(error);
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          error: { code: 'Error', message: 'shard unavailable' },
          user: { target: { id: 'jdoe' } },
          kibana: { saved_object: { type: 'session_memory', id: 'a' } },
        }),
        expect.objectContaining({
          error: { code: 'Error', message: 'shard unavailable' },
          kibana: { saved_object: { type: 'session_memory', id: 'b' } },
        }),
      ]);
    });
  });
});
