/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BULK_FILTER_MAX_RESOURCES, BULK_QUERY_SAMPLE_SIZE } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import type { PluginConfig } from '../../config';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { createRulesSavedObjectServiceMock } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import type { RulesSavedObjectServiceMock } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import type { UserService } from '../services/user_service/user_service';
import { createUserService } from '../services/user_service/user_service.mock';
import { createRuleSoAttributes } from '../test_utils';
import type { RuleEventPublisher } from '../events/rule_event_publisher/rule_event_publisher';
import { createRuleEventPublisher } from '../events/rule_event_publisher/rule_event_publisher.mock';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { RulesClient } from './rules_client';
import type { CreateRuleParams } from './types';

jest.mock('../rule_executor/schedule', () => ({
  ensureRuleExecutorTaskScheduled: jest.fn(),
  getRuleExecutorTaskId: jest.fn(),
}));

import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';

const ensureRuleExecutorTaskScheduledMock = ensureRuleExecutorTaskScheduled as jest.MockedFunction<
  typeof ensureRuleExecutorTaskScheduled
>;
const getRuleExecutorTaskIdMock = getRuleExecutorTaskId as jest.MockedFunction<
  typeof getRuleExecutorTaskId
>;

const baseCreateData: CreateRuleParams['data'] = {
  kind: 'alert',
  metadata: { name: 'rule-1' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '1m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
};

const baseSoAttrs = createRuleSoAttributes({
  metadata: { name: 'rule-1' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '1m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
});

describe('RulesClient', () => {
  const request: KibanaRequest = httpServerMock.createKibanaRequest();
  const taskManager = taskManagerMock.createStart();
  let userService: UserService;
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let rulesSavedObjectService: RulesSavedObjectServiceMock;
  let ruleEventPublisher: RuleEventPublisher;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    rulesSavedObjectService = createRulesSavedObjectServiceMock();

    ({ publisher: ruleEventPublisher } = createRuleEventPublisher());
    jest.spyOn(ruleEventPublisher, 'emitRuleCreated');
    jest.spyOn(ruleEventPublisher, 'emitRuleUpdated');
    jest.spyOn(ruleEventPublisher, 'emitRuleDeleted');
    jest.spyOn(ruleEventPublisher, 'emitRuleEnabled');
    jest.spyOn(ruleEventPublisher, 'emitRuleDisabled');

    ({ userService } = createUserService());
    ({ loggerService, mockLogger } = createLoggerService());

    ensureRuleExecutorTaskScheduledMock.mockResolvedValue({ id: 'task-123' });
    getRuleExecutorTaskIdMock.mockReturnValue('task:fallback');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createClient(rulesConfigOverrides?: Partial<PluginConfig['rules']>) {
    const config: PluginConfig = {
      enabled: true,
      invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
      rules: {
        minimumScheduleInterval: '1m',
        maxScheduledPerMinute: 400,
        run: { alerts: { max: 10000 } },
        ...rulesConfigOverrides,
      },
    };

    const pluginConfigAccessor =
      coreMock.createPluginInitializerContext<PluginConfig>(config).config;

    return new RulesClient(
      request,
      rulesSavedObjectService,
      taskManager,
      userService,
      'space-1',
      pluginConfigAccessor,
      rulesSavedObjectService,
      ruleEventPublisher,
      loggerService
    );
  }

  describe('createRule', () => {
    it('creates a rule SO and schedules a task', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-id-1' });

      const res = await client.createRule({
        data: baseCreateData,
        options: { id: 'rule-id-1' },
      });

      expect(rulesSavedObjectService.create).toHaveBeenCalledWith({
        attrs: expect.objectContaining({
          metadata: expect.objectContaining({ name: 'rule-1' }),
          enabled: true,
          createdBy: 'elastic_profile_uid',
        }),
        id: 'rule-id-1',
      });

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalledWith({
        services: { taskManager },
        input: expect.objectContaining({
          ruleId: 'rule-id-1',
          schedule: { interval: '1m' },
          spaceId: 'space-1',
        }),
      });

      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-1',
          metadata: expect.objectContaining({ name: 'rule-1' }),
          enabled: true,
          createdBy: 'elastic_profile_uid',
          updatedBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });

    it('cleans up the saved object if scheduling fails', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-id-3' });
      ensureRuleExecutorTaskScheduledMock.mockRejectedValueOnce(new Error('schedule failed'));

      await expect(
        client.createRule({
          data: baseCreateData,
          options: { id: 'rule-id-3' },
        })
      ).rejects.toThrow('schedule failed');

      expect(rulesSavedObjectService.delete).toHaveBeenCalledWith({ id: 'rule-id-3' });
    });

    it('throws 409 conflict when id already exists', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-4')
      );

      await expect(
        client.createRule({
          data: baseCreateData,
          options: { id: 'rule-id-4' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });

    it('creates a rule with description and includes it in the response', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-id-desc' });

      const res = await client.createRule({
        data: {
          ...baseCreateData,
          metadata: { name: 'rule-with-desc', description: 'My description' },
        },
        options: { id: 'rule-id-desc' },
      });

      expect(rulesSavedObjectService.create).toHaveBeenCalledWith({
        attrs: expect.objectContaining({
          metadata: expect.objectContaining({
            name: 'rule-with-desc',
            description: 'My description',
          }),
        }),
        id: 'rule-id-desc',
      });

      expect(res.metadata.description).toBe('My description');
    });

    it('throws 400 when ES|QL is invalid', async () => {
      const client = createClient();

      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            query: { format: 'standalone', breach: { query: 'FROM |' } },
          },
          options: { id: 'rule-id-5' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });
    });
  });

  describe('updateRule', () => {
    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-id-1')
      );

      await expect(client.updateRule({ id: 'rule-id-1', data: {} })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('updates a rule and re-schedules the task', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-1',
      });

      await client.updateRule({
        id: 'rule-id-1',
        data: { schedule: { every: '5m' } },
      });

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalledWith({
        services: { taskManager },
        input: expect.objectContaining({
          ruleId: 'rule-id-1',
          schedule: { interval: '5m' },
          spaceId: 'space-1',
        }),
      });
      expect(rulesSavedObjectService.update).toHaveBeenCalledWith({
        id: 'rule-id-1',
        attrs: expect.objectContaining({
          schedule: expect.objectContaining({ every: '5m' }),
        }),
        version: 'WzEsMV0=',
      });
    });

    it('updates the description of a rule', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-desc-update',
      });
      rulesSavedObjectService.update.mockResolvedValueOnce({ id: 'rule-id-desc-update' });

      const res = await client.updateRule({
        id: 'rule-id-desc-update',
        data: { metadata: { description: 'New description' } },
      });

      expect(rulesSavedObjectService.update).toHaveBeenCalledWith({
        id: 'rule-id-desc-update',
        attrs: expect.objectContaining({
          metadata: expect.objectContaining({ description: 'New description' }),
        }),
        version: 'WzEsMV0=',
      });

      expect(res.metadata.description).toBe('New description');
    });

    it('throws 409 conflict when version is stale', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-4',
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
      });

      rulesSavedObjectService.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-4')
      );

      await expect(client.updateRule({ id: 'rule-id-4', data: {} })).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });

    it('throws 400 when setting stateTransition on a signal rule', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'signal',
      };

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-signal',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
      });

      await expect(
        client.updateRule({
          id: 'rule-id-signal',
          data: { state_transition: { pending_count: 3 } },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: 'stateTransition is only allowed for rules of kind "alert".',
      });

      expect(rulesSavedObjectService.update).not.toHaveBeenCalled();
    });

    it('allows setting stateTransition on an alert rule', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'alert',
      };

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-alert',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
      });

      await expect(
        client.updateRule({
          id: 'rule-id-alert',
          data: {
            state_transition: { pending_count: 3, recovering_count: 5 },
          },
        })
      ).resolves.not.toThrow();
    });

    it('allows setting state_transition to null on a signal rule (removing it)', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'signal',
      };

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-signal-null',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
      });

      await client.updateRule({
        id: 'rule-id-signal-null',
        data: { state_transition: null },
      });
    });

    it('replaces state_transition entirely without preserving stale sub-fields', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'alert',
        state_transition: { pending_count: 2, recovering_count: 3 },
      };

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-partial-st',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
      });

      await client.updateRule({
        id: 'rule-partial-st',
        data: { state_transition: { recovering_count: 3 } },
      });

      expect(rulesSavedObjectService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rule-partial-st',
          attrs: expect.objectContaining({
            state_transition: { recovering_count: 3 },
          }),
        })
      );
      const { attrs } = rulesSavedObjectService.update.mock.calls[0][0];
      expect(attrs.state_transition).toEqual({ recovering_count: 3 });
      expect(attrs.state_transition?.pending_count).toBeUndefined();
    });

    it('clears artifacts when update payload sets artifacts to null', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        artifacts: [{ id: 'runbook-id', type: 'runbook', value: 'Persisted runbook' }],
      };

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-clear-artifacts',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
      });

      await client.updateRule({
        id: 'rule-id-clear-artifacts',
        data: { artifacts: null },
      });

      expect(rulesSavedObjectService.update).toHaveBeenCalledWith({
        id: 'rule-id-clear-artifacts',
        attrs: expect.objectContaining({ artifacts: [] }),
        version: 'WzEsMV0=',
      });
    });

    it('uses the client-provided version when supplied', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-occ',
        attributes: baseSoAttrs,
        version: 'WzSERVER=',
      });

      await client.updateRule({
        id: 'rule-id-occ',
        data: { metadata: { name: 'occ name' } },
        options: { version: 'WzCLIENT=' },
      });

      expect(rulesSavedObjectService.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rule-id-occ', version: 'WzCLIENT=' })
      );
    });

    it('falls back to the server-read version when client omits version', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-fallback',
        attributes: baseSoAttrs,
        version: 'WzSERVER=',
      });

      await client.updateRule({
        id: 'rule-id-fallback',
        data: { metadata: { name: 'fallback name' } },
      });

      expect(rulesSavedObjectService.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rule-id-fallback', version: 'WzSERVER=' })
      );
    });

    it('returns the new version from the SO update in the response', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-new-ver',
        attributes: baseSoAttrs,
        version: 'WzOLD=',
      });
      rulesSavedObjectService.update.mockResolvedValueOnce({
        id: 'rule-id-new-ver',
        version: 'WzNEW=',
      });

      const res = await client.updateRule({
        id: 'rule-id-new-ver',
        data: { metadata: { name: 'whatever' } },
      });

      expect(res.version).toBe('WzNEW=');
    });
  });

  describe('upsertRule', () => {
    describe('create rule (id does not exist)', () => {
      beforeEach(() => {
        rulesSavedObjectService.get.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-id-1')
        );
      });

      it('creates the rule SO with enabled=true and schedules the task', async () => {
        const client = createClient();
        rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-id-1' });

        const res = await client.upsertRule({ id: 'rule-id-1', data: baseCreateData });

        expect(rulesSavedObjectService.create).toHaveBeenCalledWith({
          attrs: expect.objectContaining({
            metadata: expect.objectContaining({ name: 'rule-1' }),
            enabled: true,
            createdBy: 'elastic_profile_uid',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }),
          id: 'rule-id-1',
        });
        expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalledWith({
          services: { taskManager },
          input: expect.objectContaining({
            ruleId: 'rule-id-1',
            schedule: { interval: '1m' },
            spaceId: 'space-1',
          }),
        });
        expect(res).toEqual({
          created: true,
          rule: expect.objectContaining({ id: 'rule-id-1', enabled: true }),
        });
      });

      it('cleans up the saved object if scheduling fails', async () => {
        const client = createClient();
        rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-id-1' });
        ensureRuleExecutorTaskScheduledMock.mockRejectedValueOnce(new Error('schedule failed'));

        await expect(client.upsertRule({ id: 'rule-id-1', data: baseCreateData })).rejects.toThrow(
          'schedule failed'
        );

        expect(rulesSavedObjectService.delete).toHaveBeenCalledWith({ id: 'rule-id-1' });
      });

      it('throws 409 when another caller created the rule between get and create', async () => {
        const client = createClient();
        rulesSavedObjectService.create.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-1')
        );

        await expect(
          client.upsertRule({ id: 'rule-id-1', data: baseCreateData })
        ).rejects.toMatchObject({
          output: { statusCode: 409 },
        });

        expect(ensureRuleExecutorTaskScheduledMock).not.toHaveBeenCalled();
      });
    });

    describe('replace rule (id exists)', () => {
      it('replaces fields from the body and preserves audit + enabled', async () => {
        const client = createClient();
        const existing: RuleSavedObjectAttributes = {
          ...baseSoAttrs,
          enabled: false,
          createdBy: 'previous-creator',
          createdAt: '2024-06-01T00:00:00.000Z',
          metadata: { name: 'before' },
        };
        const existingDoc = {
          id: 'rule-id-1',
          attributes: existing,
          version: 'WzEsMV0=',
        };
        rulesSavedObjectService.get
          .mockResolvedValueOnce(existingDoc)
          .mockResolvedValueOnce(existingDoc);
        rulesSavedObjectService.update.mockResolvedValueOnce({ id: 'rule-id-1' });

        const res = await client.upsertRule({
          id: 'rule-id-1',
          data: { ...baseCreateData, metadata: { name: 'after' } },
        });

        expect(rulesSavedObjectService.update).toHaveBeenCalledWith({
          id: 'rule-id-1',
          attrs: expect.objectContaining({
            metadata: expect.objectContaining({ name: 'after' }),
            enabled: false,
            createdBy: 'previous-creator',
            createdAt: '2024-06-01T00:00:00.000Z',
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }),
          version: 'WzEsMV0=',
        });
        expect(res.created).toBe(false);
      });

      it('reschedules the task with the new interval', async () => {
        const client = createClient();
        const existingDoc = {
          id: 'rule-id-1',
          attributes: baseSoAttrs,
          version: 'WzEsMV0=',
        };
        rulesSavedObjectService.get
          .mockResolvedValueOnce(existingDoc)
          .mockResolvedValueOnce(existingDoc);

        await client.upsertRule({
          id: 'rule-id-1',
          data: { ...baseCreateData, schedule: { every: '15m' } },
        });

        expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalledWith({
          services: { taskManager },
          input: expect.objectContaining({
            ruleId: 'rule-id-1',
            schedule: { interval: '15m' },
            spaceId: 'space-1',
          }),
        });
      });

      it('throws 409 when the version is stale', async () => {
        const client = createClient();
        const existingDoc = {
          id: 'rule-id-1',
          attributes: baseSoAttrs,
          version: 'WzEsMV0=',
        };
        rulesSavedObjectService.get
          .mockResolvedValueOnce(existingDoc)
          .mockResolvedValueOnce(existingDoc);
        rulesSavedObjectService.update.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-1')
        );

        await expect(
          client.upsertRule({ id: 'rule-id-1', data: baseCreateData })
        ).rejects.toMatchObject({
          output: { statusCode: 409 },
        });
      });

      it('throws 409 when the request body changes the rule kind', async () => {
        const client = createClient();
        const existingDoc = {
          id: 'rule-id-1',
          attributes: baseSoAttrs,
          version: 'WzEsMV0=',
        };
        rulesSavedObjectService.get
          .mockResolvedValueOnce(existingDoc)
          .mockResolvedValueOnce(existingDoc);

        await expect(
          client.upsertRule({
            id: 'rule-id-1',
            data: { ...baseCreateData, kind: 'signal' },
          })
        ).rejects.toMatchObject({
          output: { statusCode: 409 },
          message: 'Some fields cannot be changed after creation: kind.',
        });

        expect(rulesSavedObjectService.update).not.toHaveBeenCalled();
      });

      it('clears optional fields that are omitted from the request body', async () => {
        const client = createClient();
        const existing: RuleSavedObjectAttributes = {
          ...baseSoAttrs,
          metadata: { name: 'rule-1', tags: ['tag-a', 'tag-b'] },
          grouping: { fields: ['host.name'] },
        };
        const existingDoc = {
          id: 'rule-id-1',
          attributes: existing,
          version: 'WzEsMV0=',
        };
        rulesSavedObjectService.get
          .mockResolvedValueOnce(existingDoc)
          .mockResolvedValueOnce(existingDoc);
        rulesSavedObjectService.update.mockResolvedValueOnce({ id: 'rule-id-1' });

        await client.upsertRule({ id: 'rule-id-1', data: baseCreateData });

        expect(rulesSavedObjectService.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'rule-id-1',
            attrs: expect.objectContaining({
              metadata: { name: 'rule-1' },
              grouping: undefined,
            }),
          })
        );
      });
    });

    it('rethrows non-not-found errors from the existing-rule lookup', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(new Error('elasticsearch unavailable'));

      await expect(client.upsertRule({ id: 'rule-id-1', data: baseCreateData })).rejects.toThrow(
        'elasticsearch unavailable'
      );

      expect(rulesSavedObjectService.create).not.toHaveBeenCalled();
      expect(rulesSavedObjectService.update).not.toHaveBeenCalled();
    });

    it('throws 400 when the body is invalid', async () => {
      const client = createClient();

      await expect(
        client.upsertRule({
          id: 'rule-id-1',
          data: { ...baseCreateData, schedule: { every: 'not-a-duration' } },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      expect(rulesSavedObjectService.get).not.toHaveBeenCalled();
    });
  });

  describe('getRule', () => {
    it('returns a rule by id', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-get-1',
      });

      const res = await client.getRule({ id: 'rule-id-get-1' });

      expect(rulesSavedObjectService.get).toHaveBeenCalledWith('rule-id-get-1');
      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-1',
          kind: 'alert',
          metadata: expect.objectContaining({ name: 'rule-1' }),
          schedule: expect.objectContaining({ every: '1m' }),
        })
      );
    });

    it('returns description in the rule response when present', async () => {
      const client = createClient();
      const soAttrsWithDesc = createRuleSoAttributes({
        metadata: { name: 'rule-with-desc', description: 'Fetched description' },
      });

      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: soAttrsWithDesc,
        version: 'WzEsMV0=',
        id: 'rule-id-get-desc',
      });

      const res = await client.getRule({ id: 'rule-id-get-desc' });

      expect(res.metadata.description).toBe('Fetched description');
    });

    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_SAVED_OBJECT_TYPE,
          'rule-id-get-404'
        )
      );

      await expect(client.getRule({ id: 'rule-id-get-404' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('getRules', () => {
    it('returns rules for the provided ids', async () => {
      const client = createClient();
      const so1Attrs = createRuleSoAttributes({ metadata: { name: 'rule-get-many-1' } });
      const so2Attrs = createRuleSoAttributes({ metadata: { name: 'rule-get-many-2' } });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-id-get-many-1', attributes: so1Attrs },
        { id: 'rule-id-get-many-2', attributes: so2Attrs },
      ]);

      const res = await client.getRules(['rule-id-get-many-1', 'rule-id-get-many-2']);

      expect(rulesSavedObjectService.bulkGetByIds).toHaveBeenCalledWith([
        'rule-id-get-many-1',
        'rule-id-get-many-2',
      ]);
      expect(res).toHaveLength(2);
      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-many-1',
          metadata: expect.objectContaining({ name: 'rule-get-many-1' }),
        })
      );
      expect(res[1]).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-many-2',
          metadata: expect.objectContaining({ name: 'rule-get-many-2' }),
        })
      );
    });

    it('returns rules in the same order as the requested ids, regardless of bulkGet response order', async () => {
      const client = createClient();

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-a', attributes: createRuleSoAttributes({ metadata: { name: 'A' } }) },
        { id: 'rule-m', attributes: createRuleSoAttributes({ metadata: { name: 'M' } }) },
        { id: 'rule-z', attributes: createRuleSoAttributes({ metadata: { name: 'Z' } }) },
      ]);

      const res = await client.getRules(['rule-z', 'rule-a', 'rule-m']);

      expect(res.map((r) => r.id)).toEqual(['rule-z', 'rule-a', 'rule-m']);
    });

    it('skips missing rules when their ids are omitted from the request', async () => {
      const client = createClient();

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        {
          id: 'rule-id-present',
          attributes: createRuleSoAttributes({ metadata: { name: 'present' } }),
        },
      ]);

      const res = await client.getRules(['rule-id-present', 'rule-id-absent']);

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 'rule-id-present',
          metadata: expect.objectContaining({ name: 'present' }),
        })
      );
    });

    it('throws with the SO error status when a requested id is missing', async () => {
      const client = createClient();

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        {
          id: 'rule-id-present',
          attributes: createRuleSoAttributes({ metadata: { name: 'present' } }),
        },
        {
          id: 'rule-id-missing',
          error: {
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [alerting-rule/rule-id-missing] not found',
          },
        },
      ]);

      await expect(client.getRules(['rule-id-present', 'rule-id-missing'])).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws with the SO error status when bulkGet reports a non-404 error', async () => {
      const client = createClient();

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        {
          id: 'rule-id-valid',
          attributes: createRuleSoAttributes({ metadata: { name: 'valid' } }),
        },
        {
          id: 'rule-id-failure',
          error: {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'bulk get failed',
          },
        },
      ]);

      await expect(client.getRules(['rule-id-valid', 'rule-id-failure'])).rejects.toMatchObject({
        output: { statusCode: 500 },
      });
    });

    it('throws on the first encountered error', async () => {
      const client = createClient();

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        {
          id: 'rule-id-first-missing',
          error: {
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [alerting-rule/rule-id-first-missing] not found',
          },
        },
        {
          id: 'rule-id-second-failure',
          error: {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'bulk get failed',
          },
        },
      ]);

      // 'first error wins': the 404 surfaces, not the later 500.
      await expect(
        client.getRules(['rule-id-first-missing', 'rule-id-second-failure'])
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('deleteRule', () => {
    it('removes the scheduled task and deletes the rule', async () => {
      const client = createClient();

      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-del-1',
      });
      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:delete');

      await client.deleteRule({ id: 'rule-id-del-1' });

      expect(getRuleExecutorTaskIdMock).toHaveBeenCalledWith({
        ruleId: 'rule-id-del-1',
        spaceId: 'space-1',
      });
      expect(taskManager.removeIfExists).toHaveBeenCalledWith('task:delete');
      expect(rulesSavedObjectService.delete).toHaveBeenCalledWith({ id: 'rule-id-del-1' });
    });

    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_SAVED_OBJECT_TYPE,
          'rule-id-del-404'
        )
      );

      await expect(client.deleteRule({ id: 'rule-id-del-404' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('findRules', () => {
    it('returns a paginated list of rules', async () => {
      const client = createClient();

      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            attributes: createRuleSoAttributes({ metadata: { name: 'rule-1' } }),
          },
          {
            id: 'rule-2',
            attributes: createRuleSoAttributes({ metadata: { name: 'rule-2' } }),
          },
        ],
        total: 2,
      });

      const res = await client.findRules({ page: 2, perPage: 50 });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, perPage: 50 })
      );

      expect(res.items).toHaveLength(2);
      expect(res.items[0]).toEqual(
        expect.objectContaining({
          id: 'rule-1',
          metadata: expect.objectContaining({ name: 'rule-1' }),
        })
      );
      expect(res.items[1]).toEqual(
        expect.objectContaining({
          id: 'rule-2',
          metadata: expect.objectContaining({ name: 'rule-2' }),
        })
      );
      expect(res.total).toBe(2);
      expect(res.page).toBe(2);
      expect(res.perPage).toBe(50);
    });

    it('uses default pagination when no page params are provided', async () => {
      const client = createClient();

      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-pagination-1',
            attributes: createRuleSoAttributes({ metadata: { name: 'rule-pagination-1' } }),
          },
        ],
        total: 100,
      });

      const res = await client.findRules();

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, perPage: 20 })
      );
      expect(rulesSavedObjectService.bulkGetByIds).not.toHaveBeenCalled();

      expect(res.total).toBe(100);
      expect(res.page).toBe(1);
      expect(res.perPage).toBe(20);
    });

    it('translates clean API filter to SO filter before passing to saved objects client', async () => {
      const client = createClient();

      await client.findRules({ filter: 'enabled: true' });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          perPage: 20,
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
        })
      );
    });

    it('passes search and searchFields to the saved objects client', async () => {
      const client = createClient();

      await client.findRules({ page: 2, perPage: 10, search: 'prod alerts' });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          perPage: 10,
          search: 'prod* alerts*',
          searchFields: ['metadata.name', 'metadata.description'],
        })
      );
    });

    it('trims search before passing it to the saved objects client', async () => {
      const client = createClient();

      await client.findRules({ search: '  prod alerts  ' });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'prod* alerts*' })
      );
    });

    it('passes filter and search as separate params', async () => {
      const client = createClient();

      await client.findRules({ filter: 'enabled: true', search: 'prod' });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
          search: 'prod*',
          searchFields: ['metadata.name', 'metadata.description'],
        })
      );
    });

    it('does not pass filter when it is undefined', async () => {
      const client = createClient();

      await client.findRules({});

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, perPage: 20 })
      );
      const [args] = rulesSavedObjectService.find.mock.calls[0];
      expect(args.filter).toBeUndefined();
    });

    it('maps kind sorting without transformation', async () => {
      const client = createClient();

      await client.findRules({ sortField: 'kind', sortOrder: 'desc' });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'kind', sortOrder: 'desc' })
      );
    });

    it('maps enabled sorting without transformation', async () => {
      const client = createClient();

      await client.findRules({ sortField: 'enabled', sortOrder: 'desc' });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'enabled', sortOrder: 'desc' })
      );
    });
  });

  describe('getTags', () => {
    it('returns the aggregated tags without a filter', async () => {
      const client = createClient();

      rulesSavedObjectService.findTags.mockResolvedValueOnce(['cpu', 'memory']);

      const tags = await client.getTags();

      expect(tags).toEqual(['cpu', 'memory']);
      expect(rulesSavedObjectService.findTags).toHaveBeenCalledWith({ filter: undefined });
    });

    it('translates a clean API filter to an SO filter before aggregating', async () => {
      const client = createClient();

      rulesSavedObjectService.findTags.mockResolvedValueOnce(['cpu']);

      await client.getTags({ filter: 'kind:alert' });

      expect(rulesSavedObjectService.findTags).toHaveBeenCalledWith({
        filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.kind: alert`,
      });
    });
  });

  describe('bulkDeleteRules', () => {
    it('removes tasks and deletes saved objects for all ids', async () => {
      const client = createClient();

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:rule-1')
        .mockReturnValueOnce('task:rule-2');

      rulesSavedObjectService.bulkDelete.mockResolvedValueOnce([
        { id: 'rule-1', success: true },
        { id: 'rule-2', success: true },
      ]);

      const res = await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

      expect(taskManager.bulkRemove).toHaveBeenCalledWith(['task:rule-1', 'task:rule-2']);
      expect(rulesSavedObjectService.bulkDelete).toHaveBeenCalledWith(['rule-1', 'rule-2']);
      expect(res).toEqual({ affected_count: 2, errors: [] });
    });

    it('returns errors with RULE_NOT_FOUND code for rules that failed to delete', async () => {
      const client = createClient();

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:rule-1')
        .mockReturnValueOnce('task:rule-2');

      rulesSavedObjectService.bulkDelete.mockResolvedValueOnce([
        { id: 'rule-1', success: true },
        {
          id: 'rule-2',
          success: false,
          error: { error: 'Not Found', message: 'Rule not found', statusCode: 404 },
        },
      ]);

      const res = await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

      expect(res.affected_count).toBe(1);
      expect(res.errors).toEqual([
        { id: 'rule-2', error: { code: 'RULE_NOT_FOUND', message: 'Rule not found' } },
      ]);
    });

    it('continues with deletion even if task removal fails', async () => {
      const client = createClient();

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:rule-1')
        .mockReturnValueOnce('task:rule-2');

      taskManager.bulkRemove.mockRejectedValueOnce(new Error('task removal failed'));

      rulesSavedObjectService.bulkDelete.mockResolvedValueOnce([
        { id: 'rule-1', success: true },
        { id: 'rule-2', success: true },
      ]);

      const res = await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

      expect(res).toEqual({ affected_count: 2, errors: [] });
    });

    it('returns a zero-affected empty response when ids is an empty array', async () => {
      const client = createClient();

      const res = await client.bulkDeleteRules({ ids: [] });

      expect(rulesSavedObjectService.bulkDelete).not.toHaveBeenCalled();
      expect(taskManager.bulkRemove).not.toHaveBeenCalled();
      expect(res).toEqual({ affected_count: 0, errors: [] });
    });
  });

  describe('bulkEnableRules', () => {
    it('enables disabled rules and reports them as affected', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-1', attributes: disabledAttrs, version: 'v1' },
      ]);

      rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([{ id: 'rule-1', success: true }]);

      const res = await client.bulkEnableRules({ ids: ['rule-1'] });

      expect(rulesSavedObjectService.bulkUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'rule-1',
          attrs: expect.objectContaining({
            enabled: true,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }),
        }),
      ]);

      expect(taskManager.bulkSchedule).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: 'task:fallback',
            params: expect.objectContaining({ ruleId: 'rule-1' }),
            enabled: true,
          }),
        ],
        expect.objectContaining({ request, cloneApiKey: true })
      );

      expect(res).toEqual({ affected_count: 1, errors: [] });
    });

    it('logs a warning when task scheduling fails but still counts the rule as affected', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-1', attributes: disabledAttrs, version: 'v1' },
      ]);

      rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([{ id: 'rule-1', success: true }]);

      taskManager.bulkSchedule.mockRejectedValueOnce(new Error('Failed to grant UIAM API key'));

      const res = await client.bulkEnableRules({ ids: ['rule-1'] });

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to grant UIAM API key')
      );
      expect(res).toEqual({ affected_count: 1, errors: [] });
    });

    it('counts already-enabled rules as affected without updating them (idempotent)', async () => {
      const client = createClient();

      const enabledAttrs = createRuleSoAttributes({
        metadata: { name: 'enabled-rule' },
        enabled: true,
      });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-1', attributes: enabledAttrs, version: 'v1' },
      ]);

      const res = await client.bulkEnableRules({ ids: ['rule-1'] });

      expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
      expect(res).toEqual({ affected_count: 1, errors: [] });
    });

    it('returns RULE_NOT_FOUND errors for rules that fail to fetch', async () => {
      const client = createClient();

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        {
          id: 'rule-missing',
          error: { statusCode: 404, error: 'Not Found', message: 'Saved object not found' },
        },
      ]);

      const res = await client.bulkEnableRules({ ids: ['rule-missing'] });

      expect(res.affected_count).toBe(0);
      expect(res.errors).toEqual([
        {
          id: 'rule-missing',
          error: { code: 'RULE_NOT_FOUND', message: 'Saved object not found' },
        },
      ]);
    });

    it('returns RULE_VERSION_CONFLICT errors for rules that fail to update', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-1', attributes: disabledAttrs, version: 'v1' },
      ]);

      rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([
        {
          id: 'rule-1',
          success: false,
          error: { statusCode: 409, error: 'Conflict', message: 'Version conflict' },
        },
      ]);

      const res = await client.bulkEnableRules({ ids: ['rule-1'] });

      expect(res.affected_count).toBe(0);
      expect(res.errors).toEqual([
        { id: 'rule-1', error: { code: 'RULE_VERSION_CONFLICT', message: 'Version conflict' } },
      ]);
    });

    it('returns a zero-affected empty response when ids is an empty array', async () => {
      const client = createClient();

      const res = await client.bulkEnableRules({ ids: [] });

      expect(rulesSavedObjectService.bulkGetByIds).not.toHaveBeenCalled();
      expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
      expect(res).toEqual({ affected_count: 0, errors: [] });
    });
  });

  describe('bulkDisableRules', () => {
    it('disables enabled rules and calls bulkDisable on task manager', async () => {
      const client = createClient();

      const enabledAttrs = createRuleSoAttributes({
        metadata: { name: 'enabled-rule' },
        enabled: true,
      });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-1', attributes: enabledAttrs, version: 'v1' },
      ]);

      rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([{ id: 'rule-1', success: true }]);

      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:rule-1');

      const res = await client.bulkDisableRules({ ids: ['rule-1'] });

      expect(rulesSavedObjectService.bulkUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'rule-1',
          attrs: expect.objectContaining({
            enabled: false,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }),
        }),
      ]);

      expect(taskManager.bulkDisable).toHaveBeenCalledWith(['task:rule-1']);

      expect(res).toEqual({ affected_count: 1, errors: [] });
    });

    it('counts already-disabled rules as affected without updating them (idempotent)', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-1', attributes: disabledAttrs, version: 'v1' },
      ]);

      const res = await client.bulkDisableRules({ ids: ['rule-1'] });

      expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
      expect(taskManager.bulkDisable).not.toHaveBeenCalled();
      expect(res).toEqual({ affected_count: 1, errors: [] });
    });

    it('returns RULE_NOT_FOUND errors for rules that fail to fetch', async () => {
      const client = createClient();

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        {
          id: 'rule-missing',
          error: { statusCode: 404, error: 'Not Found', message: 'Saved object not found' },
        },
      ]);

      const res = await client.bulkDisableRules({ ids: ['rule-missing'] });

      expect(res.affected_count).toBe(0);
      expect(res.errors).toEqual([
        {
          id: 'rule-missing',
          error: { code: 'RULE_NOT_FOUND', message: 'Saved object not found' },
        },
      ]);
    });

    it('continues even if bulkDisable on task manager fails', async () => {
      const client = createClient();

      const enabledAttrs = createRuleSoAttributes({
        metadata: { name: 'enabled-rule' },
        enabled: true,
      });

      rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
        { id: 'rule-1', attributes: enabledAttrs, version: 'v1' },
      ]);

      rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([{ id: 'rule-1', success: true }]);

      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:rule-1');
      taskManager.bulkDisable.mockRejectedValueOnce(new Error('task disable failed'));

      const res = await client.bulkDisableRules({ ids: ['rule-1'] });

      expect(res).toEqual({ affected_count: 1, errors: [] });
    });

    it('returns a zero-affected empty response when ids is an empty array', async () => {
      const client = createClient();

      const res = await client.bulkDisableRules({ ids: [] });

      expect(rulesSavedObjectService.bulkGetByIds).not.toHaveBeenCalled();
      expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
      expect(res).toEqual({ affected_count: 0, errors: [] });
    });
  });

  describe('by-query bulk operations', () => {
    describe('deleteRulesByQuery', () => {
      it('returns a dry-run preview (match_count + capped sample) when force is false', async () => {
        const client = createClient();
        const totalMatches = BULK_QUERY_SAMPLE_SIZE + 10;
        const cappedIds = Array.from({ length: BULK_QUERY_SAMPLE_SIZE }, (_, i) => `dry-${i}`);
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(totalMatches);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(cappedIds);

        const res = await client.deleteRulesByQuery({ match_all: true });

        expect(rulesSavedObjectService.getRuleIdsByQuery).toHaveBeenCalledWith(
          expect.objectContaining({ maxItems: BULK_QUERY_SAMPLE_SIZE })
        );
        expect(rulesSavedObjectService.bulkDelete).not.toHaveBeenCalled();
        expect(taskManager.bulkRemove).not.toHaveBeenCalled();
        expect(res).toEqual({ match_count: totalMatches, sample: cappedIds });
      });

      it('skips the id stream on a dry-run when nothing matches', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(0);

        const res = await client.deleteRulesByQuery({ match_all: true });

        expect(rulesSavedObjectService.getRuleIdsByQuery).not.toHaveBeenCalled();
        expect(res).toEqual({ match_count: 0, sample: [] });
      });

      it('threads the filter and search selectors through to both count and stream calls', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(1);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(['probe']);

        await client.deleteRulesByQuery({ filter: 'enabled: true', search: 'prod' });

        const expectedQuery = expect.objectContaining({
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
          search: 'prod*',
          searchFields: ['metadata.name', 'metadata.description'],
        });
        expect(rulesSavedObjectService.countByQuery).toHaveBeenCalledWith(expectedQuery);
        expect(rulesSavedObjectService.getRuleIdsByQuery).toHaveBeenCalledWith(expectedQuery);
      });

      it('executes the delete for all resolved ids when force is true', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(2);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(['rule-a', 'rule-b']);

        getRuleExecutorTaskIdMock
          .mockReturnValueOnce('task:rule-a')
          .mockReturnValueOnce('task:rule-b');

        rulesSavedObjectService.bulkDelete.mockResolvedValueOnce([
          { id: 'rule-a', success: true },
          { id: 'rule-b', success: true },
        ]);

        const res = await client.deleteRulesByQuery({ match_all: true, force: true });

        expect(rulesSavedObjectService.getRuleIdsByQuery).toHaveBeenCalledWith(
          expect.objectContaining({ maxItems: BULK_FILTER_MAX_RESOURCES })
        );
        expect(rulesSavedObjectService.bulkDelete).toHaveBeenCalledWith(['rule-a', 'rule-b']);
        expect(taskManager.bulkRemove).toHaveBeenCalledWith(['task:rule-a', 'task:rule-b']);
        expect(res).toEqual({ affected_count: 2, errors: [] });
      });

      it('returns a zero-affected response and skips the id stream when nothing matches (force=true)', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(0);

        const res = await client.deleteRulesByQuery({ match_all: true, force: true });

        expect(rulesSavedObjectService.getRuleIdsByQuery).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkDelete).not.toHaveBeenCalled();
        expect(res).toEqual({ affected_count: 0, errors: [] });
      });
    });

    describe('enableRulesByQuery', () => {
      it('returns a dry-run preview when force is false', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(2);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(['rule-1', 'rule-2']);

        const res = await client.enableRulesByQuery({ filter: 'enabled: false' });

        expect(rulesSavedObjectService.bulkGetByIds).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
        expect(res).toEqual({ match_count: 2, sample: ['rule-1', 'rule-2'] });
      });

      it('executes the enable for all resolved ids when force is true', async () => {
        const client = createClient();
        const disabledAttrs = createRuleSoAttributes({
          metadata: { name: 'disabled-rule' },
          enabled: false,
        });

        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(1);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(['rule-1']);

        rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
          { id: 'rule-1', attributes: disabledAttrs, version: 'v1' },
        ]);

        rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([{ id: 'rule-1', success: true }]);

        const res = await client.enableRulesByQuery({ filter: 'enabled: false', force: true });

        expect(rulesSavedObjectService.bulkUpdate).toHaveBeenCalled();
        expect(res).toEqual({ affected_count: 1, errors: [] });
      });
    });

    describe('disableRulesByQuery', () => {
      it('returns a dry-run preview when force is false', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(1);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(['rule-1']);

        const res = await client.disableRulesByQuery({ filter: 'enabled: true' });

        expect(rulesSavedObjectService.bulkGetByIds).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
        expect(res).toEqual({ match_count: 1, sample: ['rule-1'] });
      });

      it('executes the disable for all resolved ids when force is true', async () => {
        const client = createClient();
        const enabledAttrs = createRuleSoAttributes({
          metadata: { name: 'enabled-rule' },
          enabled: true,
        });

        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(1);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(['rule-1']);

        rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
          { id: 'rule-1', attributes: enabledAttrs, version: 'v1' },
        ]);

        rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([{ id: 'rule-1', success: true }]);

        getRuleExecutorTaskIdMock.mockReturnValueOnce('task:rule-1');

        const res = await client.disableRulesByQuery({ filter: 'enabled: true', force: true });

        expect(rulesSavedObjectService.bulkUpdate).toHaveBeenCalled();
        expect(taskManager.bulkDisable).toHaveBeenCalledWith(['task:rule-1']);
        expect(res).toEqual({ affected_count: 1, errors: [] });
      });
    });

    describe('over-cap requests (atomicity guarantee)', () => {
      const overCapTotal = BULK_FILTER_MAX_RESOURCES + 42;

      it('rejects deleteRulesByQuery with 400 without opening the id stream or mutating rules', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(overCapTotal);

        await expect(
          client.deleteRulesByQuery({ match_all: true, force: true })
        ).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: {
            code: 'BULK_QUERY_MATCH_LIMIT_EXCEEDED',
            details: { match_count: overCapTotal, limit: BULK_FILTER_MAX_RESOURCES },
          },
        });

        expect(rulesSavedObjectService.getRuleIdsByQuery).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkDelete).not.toHaveBeenCalled();
        expect(taskManager.bulkRemove).not.toHaveBeenCalled();
      });

      it('rejects enableRulesByQuery with 400 without opening the id stream or mutating rules', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(overCapTotal);

        await expect(
          client.enableRulesByQuery({ filter: 'enabled: false', force: true })
        ).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: {
            code: 'BULK_QUERY_MATCH_LIMIT_EXCEEDED',
            details: { match_count: overCapTotal, limit: BULK_FILTER_MAX_RESOURCES },
          },
        });

        expect(rulesSavedObjectService.getRuleIdsByQuery).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkGetByIds).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
        expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
      });

      it('rejects disableRulesByQuery with 400 without opening the id stream or mutating rules', async () => {
        const client = createClient();
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(overCapTotal);

        await expect(
          client.disableRulesByQuery({ filter: 'enabled: true', force: true })
        ).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: {
            code: 'BULK_QUERY_MATCH_LIMIT_EXCEEDED',
            details: { match_count: overCapTotal, limit: BULK_FILTER_MAX_RESOURCES },
          },
        });

        expect(rulesSavedObjectService.getRuleIdsByQuery).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkGetByIds).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.bulkUpdate).not.toHaveBeenCalled();
        expect(taskManager.bulkDisable).not.toHaveBeenCalled();
      });

      it('executes when total equals the cap exactly (boundary is inclusive)', async () => {
        const client = createClient();
        const exactCapIds = Array.from(
          { length: BULK_FILTER_MAX_RESOURCES },
          (_, i) => `cap-rule-${i}`
        );
        rulesSavedObjectService.countByQuery.mockResolvedValueOnce(BULK_FILTER_MAX_RESOURCES);
        rulesSavedObjectService.getRuleIdsByQuery.mockResolvedValueOnce(exactCapIds);

        rulesSavedObjectService.bulkDelete.mockResolvedValueOnce(
          exactCapIds.map((id) => ({ id, success: true as const }))
        );

        const res = await client.deleteRulesByQuery({ match_all: true, force: true });

        expect(rulesSavedObjectService.getRuleIdsByQuery).toHaveBeenCalledWith(
          expect.objectContaining({ maxItems: BULK_FILTER_MAX_RESOURCES })
        );
        expect(rulesSavedObjectService.bulkDelete).toHaveBeenCalledTimes(1);
        expect(rulesSavedObjectService.bulkDelete.mock.calls[0][0]).toHaveLength(
          BULK_FILTER_MAX_RESOURCES
        );
        expect(res).toEqual({ affected_count: BULK_FILTER_MAX_RESOURCES, errors: [] });
      });
    });
  });

  describe('error codes and details', () => {
    it('attaches RULE_NOT_FOUND code and rule_id details when reading a missing rule', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-x')
      );

      await expect(client.getRule({ id: 'rule-x' })).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: {
          code: 'RULE_NOT_FOUND',
          details: { rule_id: 'rule-x' },
        },
      });
    });

    it('attaches RULE_NOT_FOUND code and rule_id details when deleting a missing rule', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_SAVED_OBJECT_TYPE,
          'rule-del-missing'
        )
      );

      await expect(client.deleteRule({ id: 'rule-del-missing' })).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: {
          code: 'RULE_NOT_FOUND',
          details: { rule_id: 'rule-del-missing' },
        },
      });

      expect(taskManager.removeIfExists).not.toHaveBeenCalled();
      expect(rulesSavedObjectService.delete).not.toHaveBeenCalled();
    });

    it('attaches RULE_ALREADY_EXISTS code and rule_id details when create conflicts', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-dup')
      );

      await expect(
        client.createRule({ data: baseCreateData, options: { id: 'rule-dup' } })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: {
          code: 'RULE_ALREADY_EXISTS',
          details: { rule_id: 'rule-dup' },
        },
      });
    });

    it('attaches INVALID_RULE_DATA code and structured Zod errors when create body is invalid', async () => {
      const client = createClient();

      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            schedule: { every: '1ms', lookback: '1m' },
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: {
          code: 'INVALID_RULE_DATA',
          details: {
            context: 'create',
            errors: {
              errors: [],
              properties: {
                schedule: {
                  errors: [],
                  properties: {
                    every: {
                      errors: ['Duration "1ms" is below the minimum allowed value of "5s"'],
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('attaches RULE_VERSION_CONFLICT code on optimistic concurrency failure', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-x',
        attributes: baseSoAttrs,
        version: 'v1',
      });
      rulesSavedObjectService.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-x')
      );

      await expect(
        client.updateRule({ id: 'rule-id-x', data: { metadata: { name: 'rename' } } })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: {
          code: 'RULE_VERSION_CONFLICT',
          details: { rule_id: 'rule-id-x' },
        },
      });
    });

    it('attaches INVALID_STATE_TRANSITION code when state_transition is set on a non-alert rule', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-y',
        attributes: { ...baseSoAttrs, kind: 'signal' },
        version: 'v1',
      });

      await expect(
        client.updateRule({
          id: 'rule-id-y',
          data: { state_transition: { pending_count: 2 } },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: {
          code: 'INVALID_STATE_TRANSITION',
          details: { rule_id: 'rule-id-y', rule_kind: 'signal' },
        },
      });
    });

    it('attaches INVALID_FILTER_FIELD code with allowed_fields when filter uses unknown field', async () => {
      const client = createClient();

      await expect(client.findRules({ filter: 'nonsense_field: value' })).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: {
          code: 'INVALID_FILTER_FIELD',
          details: expect.objectContaining({
            field: 'nonsense_field',
          }),
        },
      });
    });

    it('attaches BULK_QUERY_MATCH_LIMIT_EXCEEDED code and match/limit details on an over-cap force request', async () => {
      const client = createClient();
      const overCapTotal = BULK_FILTER_MAX_RESOURCES + 1;
      rulesSavedObjectService.countByQuery.mockResolvedValueOnce(overCapTotal);

      await expect(
        client.deleteRulesByQuery({ match_all: true, force: true })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: {
          code: 'BULK_QUERY_MATCH_LIMIT_EXCEEDED',
          details: { match_count: overCapTotal, limit: BULK_FILTER_MAX_RESOURCES },
        },
      });
    });
  });

  describe('workflow trigger events', () => {
    const workflowRuleTags = ['production'];
    const workflowSoAttrs = createRuleSoAttributes({
      metadata: { name: 'rule-1', tags: workflowRuleTags },
      time_field: '@timestamp',
      schedule: { every: '1m', lookback: '1m' },
      query: {
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 1' },
      },
    });
    const workflowCreateData: CreateRuleParams['data'] = {
      ...baseCreateData,
      metadata: { name: 'rule-1', tags: workflowRuleTags },
    };

    const mockGetExistingRule = (
      id: string,
      attributes: RuleSavedObjectAttributes = workflowSoAttrs,
      version = 'v1'
    ) => {
      rulesSavedObjectService.get.mockResolvedValueOnce({ id, attributes, version });
    };

    const expectNoRuleEventEmits = () => {
      expect(ruleEventPublisher.emitRuleCreated).not.toHaveBeenCalled();
      expect(ruleEventPublisher.emitRuleUpdated).not.toHaveBeenCalled();
      expect(ruleEventPublisher.emitRuleDeleted).not.toHaveBeenCalled();
      expect(ruleEventPublisher.emitRuleEnabled).not.toHaveBeenCalled();
      expect(ruleEventPublisher.emitRuleDisabled).not.toHaveBeenCalled();
    };

    describe('createRule', () => {
      it('emits ruleCreated after createRule', async () => {
        const client = createClient();
        rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-id-wf-1' });

        await client.createRule({ data: workflowCreateData, options: { id: 'rule-id-wf-1' } });

        expect(ruleEventPublisher.emitRuleCreated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-1', spaceId: 'space-1' },
        ]);
      });
    });

    describe('updateRule', () => {
      it('emits ruleUpdated only after a content update', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-2');

        await client.updateRule({
          id: 'rule-id-wf-2',
          data: { metadata: { name: 'renamed' } },
        });

        expect(ruleEventPublisher.emitRuleUpdated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-2', spaceId: 'space-1' },
        ]);
        expect(ruleEventPublisher.emitRuleEnabled).not.toHaveBeenCalled();
        expect(ruleEventPublisher.emitRuleDisabled).not.toHaveBeenCalled();
      });

      it('emits only ruleUpdated for an enable-only PATCH (no lifecycle event via the update path)', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-3', { ...workflowSoAttrs, enabled: false });

        await client.updateRule({ id: 'rule-id-wf-3', data: { enabled: true } });

        expect(ruleEventPublisher.emitRuleUpdated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-3', spaceId: 'space-1' },
        ]);
        expect(ruleEventPublisher.emitRuleEnabled).not.toHaveBeenCalled();
        expect(ruleEventPublisher.emitRuleDisabled).not.toHaveBeenCalled();
      });

      it('emits only ruleUpdated for a disable-only PATCH (no lifecycle event via the update path)', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-3b');

        await client.updateRule({ id: 'rule-id-wf-3b', data: { enabled: false } });

        expect(ruleEventPublisher.emitRuleUpdated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-3b', spaceId: 'space-1' },
        ]);
        expect(ruleEventPublisher.emitRuleEnabled).not.toHaveBeenCalled();
        expect(ruleEventPublisher.emitRuleDisabled).not.toHaveBeenCalled();
      });

      it('emits only ruleUpdated when content and enabled change together', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-3c', { ...workflowSoAttrs, enabled: false });

        await client.updateRule({
          id: 'rule-id-wf-3c',
          data: { metadata: { name: 'renamed' }, enabled: true },
        });

        expect(ruleEventPublisher.emitRuleUpdated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-3c', spaceId: 'space-1' },
        ]);
        expect(ruleEventPublisher.emitRuleEnabled).not.toHaveBeenCalled();
        expect(ruleEventPublisher.emitRuleDisabled).not.toHaveBeenCalled();
      });

      it('emits ruleUpdated only when enabled is set but unchanged in the PATCH', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-3d');

        await client.updateRule({
          id: 'rule-id-wf-3d',
          data: { enabled: true, metadata: { name: 'renamed' } },
        });

        expect(ruleEventPublisher.emitRuleUpdated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-3d', spaceId: 'space-1' },
        ]);
        expect(ruleEventPublisher.emitRuleEnabled).not.toHaveBeenCalled();
        expect(ruleEventPublisher.emitRuleDisabled).not.toHaveBeenCalled();
      });
    });

    describe('upsertRule', () => {
      it('emits ruleCreated when the rule is created', async () => {
        const client = createClient();
        rulesSavedObjectService.get.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError(
            RULE_SAVED_OBJECT_TYPE,
            'rule-id-wf-upsert-create'
          )
        );
        rulesSavedObjectService.create.mockResolvedValueOnce({
          id: 'rule-id-wf-upsert-create',
        });

        await client.upsertRule({ id: 'rule-id-wf-upsert-create', data: workflowCreateData });

        expect(ruleEventPublisher.emitRuleCreated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-upsert-create', spaceId: 'space-1' },
        ]);
      });

      it('publishes rule updated when an existing rule is replaced', async () => {
        const client = createClient();
        const existingDoc = {
          id: 'rule-id-wf-upsert-replace',
          attributes: { ...workflowSoAttrs, enabled: false },
          version: 'v1',
        };
        rulesSavedObjectService.get
          .mockResolvedValueOnce(existingDoc)
          .mockResolvedValueOnce(existingDoc);
        rulesSavedObjectService.update.mockResolvedValueOnce({
          id: 'rule-id-wf-upsert-replace',
        });

        await client.upsertRule({
          id: 'rule-id-wf-upsert-replace',
          data: { ...workflowCreateData, metadata: { name: 'replaced', tags: workflowRuleTags } },
        });

        expect(ruleEventPublisher.emitRuleUpdated).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-upsert-replace', spaceId: 'space-1' },
        ]);
      });
    });

    describe('deleteRule', () => {
      it('emits ruleDeleted with the deleted rule id', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-4');

        await client.deleteRule({ id: 'rule-id-wf-4' });

        expect(ruleEventPublisher.emitRuleDeleted).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-4', spaceId: 'space-1' },
        ]);
      });
    });

    describe('enableRule', () => {
      it('publishes rule enabled when the rule transitions to enabled', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-enable', { ...workflowSoAttrs, enabled: false });

        await client.enableRule({ id: 'rule-id-wf-enable' });

        expect(ruleEventPublisher.emitRuleEnabled).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-enable', spaceId: 'space-1' },
        ]);
      });

      it('still emits ruleEnabled and re-ensures the task when the rule is already enabled', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-enable-noop');

        await client.enableRule({ id: 'rule-id-wf-enable-noop' });

        // Re-enabling is not a no-op: it re-writes the SO and re-ensures the
        // executor task (self-heal), and still emits the event.
        expect(rulesSavedObjectService.update).toHaveBeenCalled();
        expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalled();
        expect(ruleEventPublisher.emitRuleEnabled).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-enable-noop', spaceId: 'space-1' },
        ]);
      });
    });

    describe('disableRule', () => {
      it('publishes rule disabled when the rule transitions to disabled', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-disable');

        await client.disableRule({ id: 'rule-id-wf-disable' });

        expect(ruleEventPublisher.emitRuleDisabled).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-disable', spaceId: 'space-1' },
        ]);
      });

      it('still emits ruleDisabled and removes the task when the rule is already disabled', async () => {
        const client = createClient();
        mockGetExistingRule('rule-id-wf-5', { ...workflowSoAttrs, enabled: false });

        await client.disableRule({ id: 'rule-id-wf-5' });

        // Re-disabling is not a no-op: it re-writes the SO and removes the
        // executor task (self-heal), and still emits the event.
        expect(rulesSavedObjectService.update).toHaveBeenCalled();
        expect(taskManager.removeIfExists).toHaveBeenCalled();
        expect(ruleEventPublisher.emitRuleDisabled).toHaveBeenCalledWith(request, [
          { id: 'rule-id-wf-5', spaceId: 'space-1' },
        ]);
      });
    });

    describe('bulkEnableRules', () => {
      it('emits ruleEnabled for only successfully enabled rules', async () => {
        const client = createClient();
        rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
          { id: 'rule-ok', attributes: { ...workflowSoAttrs, enabled: false }, version: 'v1' },
          {
            id: 'rule-missing',
            error: { statusCode: 404, message: 'Not found', error: 'Not found' },
          },
        ]);
        rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([
          { id: 'rule-ok', success: true },
        ]);

        await client.bulkEnableRules({ ids: ['rule-ok', 'rule-missing'] });

        expect(ruleEventPublisher.emitRuleEnabled).toHaveBeenCalledWith(request, [
          { id: 'rule-ok', spaceId: 'space-1' },
        ]);
      });

      it('does not publish when all requested rules are already enabled', async () => {
        const client = createClient();
        rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
          { id: 'rule-already-enabled', attributes: workflowSoAttrs, version: 'v1' },
        ]);

        await client.bulkEnableRules({ ids: ['rule-already-enabled'] });

        expectNoRuleEventEmits();
      });
    });

    describe('bulkDisableRules', () => {
      it('emits ruleDisabled for only successfully disabled rules', async () => {
        const client = createClient();
        rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
          { id: 'rule-ok', attributes: workflowSoAttrs, version: 'v1' },
          {
            id: 'rule-missing',
            error: { statusCode: 404, message: 'Not found', error: 'Not found' },
          },
        ]);
        rulesSavedObjectService.bulkUpdate.mockResolvedValueOnce([
          { id: 'rule-ok', success: true },
        ]);

        await client.bulkDisableRules({ ids: ['rule-ok', 'rule-missing'] });

        expect(ruleEventPublisher.emitRuleDisabled).toHaveBeenCalledWith(request, [
          { id: 'rule-ok', spaceId: 'space-1' },
        ]);
      });

      it('publishes no event (empty array) when all requested rules are already disabled', async () => {
        const client = createClient();
        rulesSavedObjectService.bulkGetByIds.mockResolvedValueOnce([
          {
            id: 'rule-already-disabled',
            attributes: { ...workflowSoAttrs, enabled: false },
            version: 'v1',
          },
        ]);

        await client.bulkDisableRules({ ids: ['rule-already-disabled'] });

        // The length guard was removed; emitRuleDisabled is invoked
        // unconditionally and no-ops on the empty array (no event published).
        expect(ruleEventPublisher.emitRuleDisabled).toHaveBeenCalledWith(request, []);
        expect(ruleEventPublisher.emitRuleEnabled).not.toHaveBeenCalled();
      });
    });

    describe('bulkDeleteRules', () => {
      it('emits ruleDeleted with the ids of successfully deleted rules', async () => {
        const client = createClient();
        rulesSavedObjectService.bulkDelete.mockResolvedValueOnce([
          { id: 'rule-1', success: true },
          { id: 'rule-2', success: true },
        ]);

        await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

        expect(ruleEventPublisher.emitRuleDeleted).toHaveBeenCalledWith(request, [
          { id: 'rule-1', spaceId: 'space-1' },
          { id: 'rule-2', spaceId: 'space-1' },
        ]);
      });

      it('publishes rule deleted only for rules that were successfully deleted', async () => {
        const client = createClient();
        rulesSavedObjectService.bulkDelete.mockResolvedValueOnce([
          { id: 'rule-1', success: true },
          {
            id: 'rule-2',
            success: false,
            error: { error: 'Not Found', message: 'Rule not found', statusCode: 404 },
          },
        ]);

        await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

        expect(ruleEventPublisher.emitRuleDeleted).toHaveBeenCalledWith(request, [
          { id: 'rule-1', spaceId: 'space-1' },
        ]);
      });
    });
  });

  describe('schedule guardrails', () => {
    describe('minimumScheduleInterval', () => {
      it('rejects creating a rule whose interval is below the configured minimum', async () => {
        const client = createClient({ minimumScheduleInterval: '1m' });

        await expect(
          client.createRule({
            data: { ...baseCreateData, schedule: { every: '30s', lookback: '1m' } },
          })
        ).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: {
            code: 'SCHEDULE_INTERVAL_TOO_SHORT',
            details: { interval: '30s', minimumScheduleInterval: '1m' },
          },
        });

        expect(rulesSavedObjectService.create).not.toHaveBeenCalled();
      });

      it('allows creating a rule whose interval equals the configured minimum', async () => {
        const client = createClient({ minimumScheduleInterval: '1m' });

        await expect(client.createRule({ data: baseCreateData })).resolves.toBeDefined();
        expect(rulesSavedObjectService.create).toHaveBeenCalled();
      });

      it('rejects updating a rule to an interval below the configured minimum', async () => {
        const client = createClient({ minimumScheduleInterval: '5m' });

        rulesSavedObjectService.get.mockResolvedValueOnce({
          attributes: baseSoAttrs,
          version: 'WzEsMV0=',
          id: 'rule-id-1',
        });

        await expect(
          client.updateRule({ id: 'rule-id-1', data: { schedule: { every: '1m' } } })
        ).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: { code: 'SCHEDULE_INTERVAL_TOO_SHORT' },
        });

        expect(rulesSavedObjectService.update).not.toHaveBeenCalled();
      });
    });

    describe('maxScheduledPerMinute', () => {
      it('rejects creating a rule when the limit is already reached', async () => {
        const client = createClient({ maxScheduledPerMinute: 1 });
        rulesSavedObjectService.getTotalScheduledPerMinute.mockResolvedValueOnce(1);

        await expect(client.createRule({ data: baseCreateData })).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: {
            code: 'MAX_SCHEDULES_PER_MINUTE_EXCEEDED',
            details: { interval: '1m', maxScheduledPerMinute: 1 },
          },
        });

        expect(rulesSavedObjectService.create).not.toHaveBeenCalled();
      });

      it('allows creating a rule when there is remaining capacity', async () => {
        const client = createClient({ maxScheduledPerMinute: 400 });
        rulesSavedObjectService.getTotalScheduledPerMinute.mockResolvedValueOnce(10);

        await expect(client.createRule({ data: baseCreateData })).resolves.toBeDefined();
        expect(rulesSavedObjectService.create).toHaveBeenCalled();
      });

      it('adds the previous schedule back when updating an already-enabled rule', async () => {
        const client = createClient({ maxScheduledPerMinute: 1 });
        // The single available slot is consumed by this rule's existing 1m schedule.
        rulesSavedObjectService.getTotalScheduledPerMinute.mockResolvedValueOnce(1);

        rulesSavedObjectService.get.mockResolvedValueOnce({
          attributes: baseSoAttrs,
          version: 'WzEsMV0=',
          id: 'rule-id-1',
        });

        // Re-saving with the same 1m schedule must not be rejected.
        await expect(
          client.updateRule({ id: 'rule-id-1', data: { schedule: { every: '1m' } } })
        ).resolves.toBeDefined();
        expect(rulesSavedObjectService.update).toHaveBeenCalled();
      });

      it('allows reducing the schedule frequency of an enabled rule without scanning, even past the limit', async () => {
        const client = createClient({ maxScheduledPerMinute: 1 });
        rulesSavedObjectService.getTotalScheduledPerMinute.mockResolvedValue(1000);

        // Existing enabled rule runs every 1m; moving to a less frequent 5m adds no load.
        rulesSavedObjectService.get.mockResolvedValueOnce({
          attributes: baseSoAttrs,
          version: 'WzEsMV0=',
          id: 'rule-id-1',
        });

        await expect(
          client.updateRule({ id: 'rule-id-1', data: { schedule: { every: '5m' } } })
        ).resolves.toBeDefined();

        // The cluster-wide scan is skipped because the schedule adds no load.
        expect(rulesSavedObjectService.getTotalScheduledPerMinute).not.toHaveBeenCalled();
        expect(rulesSavedObjectService.update).toHaveBeenCalled();
      });

      it('rejects enabling a disabled rule when the limit is already reached', async () => {
        const client = createClient({ maxScheduledPerMinute: 1 });
        rulesSavedObjectService.getTotalScheduledPerMinute.mockResolvedValueOnce(1);

        rulesSavedObjectService.get.mockResolvedValueOnce({
          attributes: { ...baseSoAttrs, enabled: false },
          version: 'WzEsMV0=',
          id: 'rule-id-1',
        });

        await expect(client.enableRule({ id: 'rule-id-1' })).rejects.toMatchObject({
          output: { statusCode: 400 },
          data: { code: 'MAX_SCHEDULES_PER_MINUTE_EXCEEDED' },
        });

        expect(rulesSavedObjectService.update).not.toHaveBeenCalled();
      });
    });
  });
});
