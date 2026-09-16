/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the builder-fields validation switches added in step 7.1.
 *
 * Coverage:
 *   Write path — opt-out (validateBuilderFields: false):
 *     - Default (true): invalid builder_fields are rejected on createRule,
 *       updateRule, and upsertRule (replace branch).
 *     - Opt-out (false): fields that fail the schema are accepted for
 *       execution-time types (only), and the validateFields hook is skipped.
 *   Write path — validateFields hook:
 *     - Hook errors reject a write when validation is on.
 *     - Hook is skipped under the opt-out.
 *   Write path — unregistered type:
 *     - Fails regardless of the validateBuilderFields flag.
 *   Read path — opt-in (validateBuilderFields: true):
 *     - Default (undefined / false): an invalid stored rule reads fine with no
 *       builder_fields_validation attached.
 *     - Opt-in: validation errors are attached per rule; the call itself never
 *       fails.
 *     - An unregistered builder type is reported as an ordinary validation
 *       error, not a thrown exception.
 *
 * Ref: rule-validation.md "Write-path validation: on by default, opt-out per call"
 * Ref: rule-validation.md "Read-path validation: off by default, opt-in per call"
 * Ref: rule-validation.md "Rules whose builder type is not registered"
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { z } from '@kbn/zod/v4';
import type { RegisteredBuilderType } from '../builder_types';
import { BuilderTypeRegistry } from '../builder_types';
import { ArtifactTypeRegistry, registerBuiltinArtifactTypes } from '../artifact_types';
import type { PluginConfig } from '../../config';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { createRulesSavedObjectServiceMock } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import type { RulesSavedObjectServiceMock } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import type { UserService } from '../services/user_service/user_service';
import { createRuleEventPublisher } from '../events/rule_event_publisher/rule_event_publisher.mock';
import type { RuleEventPublisher } from '../events/rule_event_publisher/rule_event_publisher';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createRuleSoAttributes } from '../test_utils';
import { toFindRulesArgs } from '../../routes/rules/get_rules_route';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { RulesClient } from './rules_client';

jest.mock('../rule_executor/schedule', () => ({
  ensureRuleExecutorTaskScheduled: jest.fn().mockResolvedValue({ id: 'task-123' }),
  getRuleExecutorTaskId: jest.fn().mockReturnValue('task:fallback'),
}));

// ---------------------------------------------------------------------------
// Fixture builder type: execution-time, with a validateFields hook
// ---------------------------------------------------------------------------

const EXECUTION_TYPE_ID = 'test.validation.execution';

/** Fields schema: requires `index` to be non-empty. */
const fixtureFieldsSchema = z
  .object({
    index: z.string().min(1),
    severity: z.string().optional(),
  })
  .strict();

/**
 * Fixture definition for an execution-time builder type with:
 *   - A schema that rejects an empty `index`.
 *   - A `validateFields` hook that rejects `severity: 'invalid'`.
 */
function makeExecutionTypeDefinition(): Partial<RegisteredBuilderType> {
  return {
    type: EXECUTION_TYPE_ID,
    name: 'Test validation type',
    compilation: 'execution_time',
    builderFieldsSchema:
      fixtureFieldsSchema as unknown as RegisteredBuilderType['builderFieldsSchema'],
    validateFields: (fields: unknown): string[] => {
      const f = fields as { severity?: string };
      if (f.severity === 'invalid') {
        return ['severity must not be "invalid"'];
      }
      return [];
    },
    generateQuery: jest.fn().mockReturnValue({
      format: 'standalone',
      breach: { query: 'FROM logs-* | LIMIT 1' },
    }),
  };
}

/** Valid builder_fields for the fixture type. */
const VALID_FIELDS = { index: 'logs-*', severity: 'high' };
/** Fields that fail the schema (empty index). */
const SCHEMA_INVALID_FIELDS = { index: '', severity: 'high' };
/** Fields that pass the schema but fail the validateFields hook. */
const HOOK_INVALID_FIELDS = { index: 'logs-*', severity: 'invalid' };

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

const baseCreateData = {
  kind: 'signal' as const,
  metadata: {
    name: 'detection-rule',
    builder_type: EXECUTION_TYPE_ID,
    builder_fields: VALID_FIELDS,
  },
  time_field: '@timestamp',
  schedule: { every: '5m' },
};

/** SO attributes for a stored execution-time rule with given builder_fields. */
function makeStoredRuleAttrs(
  builderFields: unknown = VALID_FIELDS,
  builderType: string = EXECUTION_TYPE_ID
): RuleSavedObjectAttributes {
  const attrs = createRuleSoAttributes({
    kind: 'signal',
    metadata: {
      name: 'detection-rule',
      builder_type: builderType,
      builder_fields: builderFields,
      ownership: { managed: true, solution: 'security', domain: 'detection' },
    },
  } as Partial<RuleSavedObjectAttributes>);
  // Execution-time rules persist no query.
  (attrs as unknown as { query: undefined }).query = undefined;
  // Signal rules cannot have recovery_strategy or no_data_strategy set to
  // non-none values; clear the defaults that createRuleSoAttributes sets.
  (attrs as unknown as { recovery_strategy: undefined }).recovery_strategy = undefined;
  (attrs as unknown as { no_data_strategy: undefined }).no_data_strategy = undefined;
  return attrs;
}

/** Wraps attributes in the shape the SO service's `find` returns per hit. */
function soFindResult(id: string, attributes: RuleSavedObjectAttributes) {
  return { id, type: RULE_SAVED_OBJECT_TYPE, attributes, references: [], score: 0 };
}

/**
 * Returns the SO-service `get` result shape for a stored rule. `upsertRule`
 * calls `get` twice: once inside `ruleExists` and once inside `getExistingRule`
 * on the replace branch. Use this helper twice via `mockResolvedValueOnce`.
 */
function soGetResult(id: string, attributes: RuleSavedObjectAttributes) {
  return { id, type: RULE_SAVED_OBJECT_TYPE, attributes, references: [] };
}

describe('RulesClient — builder fields validation switches (step 7.1)', () => {
  const request: KibanaRequest = httpServerMock.createKibanaRequest();
  const taskManager = taskManagerMock.createStart();

  let userService: UserService;
  let rulesSavedObjectService: RulesSavedObjectServiceMock;
  let ruleEventPublisher: RuleEventPublisher;
  let artifactTypeRegistry: ArtifactTypeRegistry;
  let builderTypeRegistry: BuilderTypeRegistry;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    rulesSavedObjectService = createRulesSavedObjectServiceMock();
    artifactTypeRegistry = new ArtifactTypeRegistry();
    registerBuiltinArtifactTypes(artifactTypeRegistry);
    builderTypeRegistry = new BuilderTypeRegistry();
    ({ publisher: ruleEventPublisher } = createRuleEventPublisher());
    ({ userService } = createUserService());

    // Spy but don't assert on events in this suite.
    jest.spyOn(ruleEventPublisher, 'emitRuleCreated');
    jest.spyOn(ruleEventPublisher, 'emitRuleUpdated');

    // SO service default stubs.
    rulesSavedObjectService.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 1,
    });

    taskManager.bulkRemove.mockResolvedValue({ statuses: [] });
  });

  function createClient(callerIdentity?: { solution?: string; app?: string }): RulesClient {
    const config: PluginConfig = {
      enabled: true,
      invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
      rules: {
        minimumScheduleInterval: '1m',
        maxScheduledPerMinute: 400,
        run: {
          alerts: { max: 10000 },
          query: { maxResponseSize: ByteSizeValue.parse('50mb') },
          maxGroupsPerExecution: 10000,
        },
      },
      esql: { responseFormat: 'json' },
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
      createLoggerService().loggerService,
      artifactTypeRegistry,
      builderTypeRegistry,
      callerIdentity
    );
  }

  /** Register the fixture execution-time type. Uses jest.spyOn so 'get' can be overridden per test. */
  function registerFixtureType(): void {
    jest
      .spyOn(builderTypeRegistry, 'get')
      .mockImplementation((type: string) =>
        type === EXECUTION_TYPE_ID
          ? (makeExecutionTypeDefinition() as RegisteredBuilderType)
          : undefined
      );
  }

  // -------------------------------------------------------------------------
  // Write path — opt-out
  // -------------------------------------------------------------------------

  describe('write path: validateBuilderFields opt-out on createRule', () => {
    it('rejects invalid builder_fields by default (validateBuilderFields defaults to true)', async () => {
      registerFixtureType();
      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });

      const client = createClient({ solution: 'security' });

      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            metadata: {
              ...baseCreateData.metadata,
              builder_fields: SCHEMA_INVALID_FIELDS,
            },
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: { code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS },
      });
    });

    it('accepts schema-invalid fields when validateBuilderFields is false (execution-time type)', async () => {
      registerFixtureType();
      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });
      rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-opt-out' });

      const client = createClient({ solution: 'security' });

      const rule = await client.createRule({
        data: {
          ...baseCreateData,
          metadata: {
            ...baseCreateData.metadata,
            builder_fields: SCHEMA_INVALID_FIELDS,
          },
        },
        options: { validateBuilderFields: false },
      });

      // The write succeeded and the rule was stored.
      expect(rule.id).toBe('rule-opt-out');
    });
  });

  describe('write path: validateBuilderFields opt-out on updateRule', () => {
    it('rejects invalid builder_fields by default', async () => {
      registerFixtureType();

      const storedAttrs = makeStoredRuleAttrs(VALID_FIELDS);
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));

      const client = createClient({ solution: 'security' });

      await expect(
        client.updateRule({
          id: 'rule-id',
          data: {
            metadata: {
              builder_fields: SCHEMA_INVALID_FIELDS,
            },
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: { code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS },
      });
    });

    it('accepts schema-invalid fields when validateBuilderFields is false', async () => {
      registerFixtureType();

      const storedAttrs = makeStoredRuleAttrs(VALID_FIELDS);
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));
      rulesSavedObjectService.update.mockResolvedValueOnce({ id: 'rule-id' });

      const client = createClient({ solution: 'security' });

      const rule = await client.updateRule({
        id: 'rule-id',
        data: { metadata: { builder_fields: SCHEMA_INVALID_FIELDS } },
        options: { validateBuilderFields: false },
      });

      expect(rule.id).toBe('rule-id');
    });
  });

  describe('write path: validateBuilderFields opt-out on upsertRule (replace branch)', () => {
    it('rejects invalid builder_fields by default on the replace branch', async () => {
      registerFixtureType();

      // upsertRule calls get twice: once inside ruleExists and once in the
      // replace branch's getExistingRule. Both calls must be mocked.
      const storedAttrs = makeStoredRuleAttrs(VALID_FIELDS);
      rulesSavedObjectService.get
        .mockResolvedValueOnce(soGetResult('rule-id', storedAttrs)) // ruleExists
        .mockResolvedValueOnce(soGetResult('rule-id', storedAttrs)); // getExistingRule

      const client = createClient({ solution: 'security' });

      await expect(
        client.upsertRule({
          id: 'rule-id',
          data: {
            ...baseCreateData,
            metadata: {
              ...baseCreateData.metadata,
              builder_fields: SCHEMA_INVALID_FIELDS,
            },
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: { code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS },
      });
    });

    it('accepts schema-invalid fields when validateBuilderFields is false on the replace branch', async () => {
      registerFixtureType();

      // upsertRule calls get twice: once inside ruleExists and once in the
      // replace branch's getExistingRule. Both calls must be mocked.
      const storedAttrs = makeStoredRuleAttrs(VALID_FIELDS);
      rulesSavedObjectService.get
        .mockResolvedValueOnce(soGetResult('rule-id', storedAttrs)) // ruleExists
        .mockResolvedValueOnce(soGetResult('rule-id', storedAttrs)); // getExistingRule
      rulesSavedObjectService.update.mockResolvedValueOnce({ id: 'rule-id' });

      const client = createClient({ solution: 'security' });

      const { rule } = await client.upsertRule({
        id: 'rule-id',
        data: {
          ...baseCreateData,
          metadata: {
            ...baseCreateData.metadata,
            builder_fields: SCHEMA_INVALID_FIELDS,
          },
        },
        options: { validateBuilderFields: false },
      });

      expect(rule.id).toBe('rule-id');
    });
  });

  // -------------------------------------------------------------------------
  // Write path — validateFields hook
  // -------------------------------------------------------------------------

  describe('write path: validateFields hook', () => {
    it('rejects a write when the validateFields hook returns errors', async () => {
      registerFixtureType();
      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });

      const client = createClient({ solution: 'security' });

      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            metadata: { ...baseCreateData.metadata, builder_fields: HOOK_INVALID_FIELDS },
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: { code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS },
      });
    });

    it('skips the validateFields hook when validateBuilderFields is false', async () => {
      registerFixtureType();
      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });
      rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-hook-skipped' });

      const client = createClient({ solution: 'security' });

      // HOOK_INVALID_FIELDS passes the schema (index is non-empty) but fails the hook.
      // With opt-out the hook is skipped so the write succeeds.
      const rule = await client.createRule({
        data: {
          ...baseCreateData,
          metadata: { ...baseCreateData.metadata, builder_fields: HOOK_INVALID_FIELDS },
        },
        options: { validateBuilderFields: false },
      });

      expect(rule.id).toBe('rule-hook-skipped');
    });
  });

  // -------------------------------------------------------------------------
  // Write path — unregistered type
  // -------------------------------------------------------------------------

  describe('write path: unregistered builder type', () => {
    it('fails a write even with validateBuilderFields false when the type is unregistered', async () => {
      // No type registered — registry.get returns undefined.
      jest.spyOn(builderTypeRegistry, 'get').mockReturnValue(undefined);
      // registry.generate is the real method — it throws UNKNOWN_BUILDER_TYPE.

      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });

      const client = createClient({ solution: 'security' });

      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            metadata: { ...baseCreateData.metadata, builder_fields: VALID_FIELDS },
          },
          options: { validateBuilderFields: false },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: { code: ALERTING_ERROR_CODES.UNKNOWN_BUILDER_TYPE },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Read path — opt-in on getRule
  // -------------------------------------------------------------------------

  describe('read path: validateBuilderFields opt-in on getRule', () => {
    it('reads an invalid stored rule fine without opt-in (no builder_fields_validation attached)', async () => {
      registerFixtureType();

      const storedAttrs = makeStoredRuleAttrs(SCHEMA_INVALID_FIELDS);
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));

      const client = createClient({ solution: 'security' });
      const rule = await client.getRule({ id: 'rule-id' });

      // Call succeeded and no validation was attached.
      expect(rule.id).toBe('rule-id');
      expect(rule.builder_fields_validation).toBeUndefined();
    });

    it('reports validation errors for an invalid stored rule when opt-in is set', async () => {
      registerFixtureType();

      const storedAttrs = makeStoredRuleAttrs(SCHEMA_INVALID_FIELDS);
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));

      const client = createClient({ solution: 'security' });
      const rule = await client.getRule({ id: 'rule-id' }, { validateBuilderFields: true });

      // Call still succeeded.
      expect(rule.id).toBe('rule-id');

      // Validation result is attached and reports failure.
      expect(rule.builder_fields_validation).toBeDefined();
      expect(rule.builder_fields_validation?.valid).toBe(false);
      expect(rule.builder_fields_validation?.errors.length).toBeGreaterThan(0);
    });

    it('reports valid when builder_fields are valid and hook passes under opt-in', async () => {
      registerFixtureType();

      const storedAttrs = makeStoredRuleAttrs(VALID_FIELDS);
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));

      const client = createClient({ solution: 'security' });
      const rule = await client.getRule({ id: 'rule-id' }, { validateBuilderFields: true });

      expect(rule.builder_fields_validation).toEqual({ valid: true, errors: [] });
    });

    it('reports validateFields hook errors under opt-in', async () => {
      registerFixtureType();

      const storedAttrs = makeStoredRuleAttrs(HOOK_INVALID_FIELDS);
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));

      const client = createClient({ solution: 'security' });
      const rule = await client.getRule({ id: 'rule-id' }, { validateBuilderFields: true });

      expect(rule.builder_fields_validation?.valid).toBe(false);
      expect(rule.builder_fields_validation?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('invalid') }),
        ])
      );
    });

    it('reports Unknown builder type under opt-in without throwing', async () => {
      // Type is not registered.
      jest.spyOn(builderTypeRegistry, 'get').mockReturnValue(undefined);

      const storedAttrs = makeStoredRuleAttrs(VALID_FIELDS, 'security.detection.stale');
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));

      const client = createClient({ solution: 'security' });
      const rule = await client.getRule({ id: 'rule-id' }, { validateBuilderFields: true });

      // The call succeeded — no throw.
      expect(rule.id).toBe('rule-id');

      // Validation reports the unknown type as an error.
      expect(rule.builder_fields_validation?.valid).toBe(false);
      expect(rule.builder_fields_validation?.errors).toEqual([
        { path: '', message: 'Unknown builder type: "security.detection.stale"' },
      ]);
    });

    it('reads a rule with an unregistered builder type fine without opt-in', async () => {
      jest.spyOn(builderTypeRegistry, 'get').mockReturnValue(undefined);

      const storedAttrs = makeStoredRuleAttrs(VALID_FIELDS, 'security.detection.stale');
      rulesSavedObjectService.get.mockResolvedValueOnce(soGetResult('rule-id', storedAttrs));

      const client = createClient({ solution: 'security' });
      const rule = await client.getRule({ id: 'rule-id' });

      // Call succeeded with no validation.
      expect(rule.id).toBe('rule-id');
      expect(rule.builder_fields_validation).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Read path — opt-in on findRules
  // -------------------------------------------------------------------------

  describe('read path: validateBuilderFields opt-in on findRules', () => {
    it('reads invalid stored rules fine without opt-in (no builder_fields_validation attached)', async () => {
      registerFixtureType();

      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [soFindResult('rule-1', makeStoredRuleAttrs(SCHEMA_INVALID_FIELDS))],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const client = createClient({ solution: 'security' });
      const result = await client.findRules({});

      expect(result.items[0].id).toBe('rule-1');
      expect(result.items[0].builder_fields_validation).toBeUndefined();
    });

    it('attaches per-rule validation results under opt-in', async () => {
      registerFixtureType();

      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [
          soFindResult('rule-valid', makeStoredRuleAttrs(VALID_FIELDS)),
          soFindResult('rule-invalid', makeStoredRuleAttrs(SCHEMA_INVALID_FIELDS)),
        ],
        total: 2,
        page: 1,
        per_page: 20,
      });

      const client = createClient({ solution: 'security' });
      const result = await client.findRules({ validateBuilderFields: true });

      expect(result.items).toHaveLength(2);

      // Valid rule.
      const validItem = result.items.find((r) => r.id === 'rule-valid');
      expect(validItem?.builder_fields_validation).toEqual({ valid: true, errors: [] });

      // Invalid rule (still in the list — the call never fails).
      const invalidItem = result.items.find((r) => r.id === 'rule-invalid');
      expect(invalidItem?.builder_fields_validation?.valid).toBe(false);
      expect(invalidItem?.builder_fields_validation?.errors.length).toBeGreaterThan(0);
    });

    it('reports Unknown builder type per-rule under opt-in without throwing', async () => {
      jest.spyOn(builderTypeRegistry, 'get').mockReturnValue(undefined);

      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [
          soFindResult('rule-stale', makeStoredRuleAttrs(VALID_FIELDS, 'security.detection.stale')),
        ],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const client = createClient({ solution: 'security' });
      const result = await client.findRules({ validateBuilderFields: true });

      // List still has the rule — the call does not fail.
      expect(result.items).toHaveLength(1);
      expect(result.items[0].builder_fields_validation?.valid).toBe(false);
      expect(result.items[0].builder_fields_validation?.errors).toEqual([
        { path: '', message: 'Unknown builder type: "security.detection.stale"' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // HTTP routes do not pass validateBuilderFields
  // -------------------------------------------------------------------------

  describe('HTTP routes: validateBuilderFields is not passed by routes', () => {
    it('toFindRulesArgs does not include validateBuilderFields in its output', () => {
      // The route converts the query string to client args. validateBuilderFields
      // is not a query parameter, so it must not appear in the output. The opt-in
      // is for in-process callers only.
      const args = toFindRulesArgs({
        page: 1,
        per_page: 20,
        filter: 'kind:alert',
        search: 'error',
        sort_field: 'name',
        sort_order: 'asc',
      });

      expect(Object.keys(args)).not.toContain('validateBuilderFields');
    });
  });

  // -------------------------------------------------------------------------
  // Kind-pin check (check 5 per-write half, rule-type-registration.md)
  // -------------------------------------------------------------------------

  describe('kind-pin check: RULE_KIND_MISMATCH on createRule', () => {
    /** Register a fixture type that pins kind: 'signal'. */
    function registerSignalPinnedType(): void {
      jest.spyOn(builderTypeRegistry, 'get').mockImplementation((type: string) =>
        type === EXECUTION_TYPE_ID
          ? ({
              ...makeExecutionTypeDefinition(),
              kind: 'signal' as const,
            } as RegisteredBuilderType)
          : undefined
      );
    }

    it('accepts create when the write kind matches the pin', async () => {
      registerSignalPinnedType();
      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });
      rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'rule-ok' });

      const client = createClient({ solution: 'security' });
      // kind: 'signal' matches the pin — should succeed.
      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            kind: 'signal',
          },
        })
      ).resolves.toBeDefined();
    });

    it('rejects create when the write kind does not match the pin', async () => {
      registerSignalPinnedType();
      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });

      const client = createClient({ solution: 'security' });
      // kind: 'alert' violates the pin (pin is 'signal').
      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            kind: 'alert',
          },
        })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 400 },
        data: {
          code: ALERTING_ERROR_CODES.RULE_KIND_MISMATCH,
          details: expect.objectContaining({
            write_kind: 'alert',
            required_kind: 'signal',
            builder_type: EXECUTION_TYPE_ID,
          }),
        },
      });
    });
  });
});
