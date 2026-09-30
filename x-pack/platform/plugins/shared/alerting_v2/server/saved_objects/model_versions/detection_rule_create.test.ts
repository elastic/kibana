/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.1 — create-a-rule tests using the framework's RulesClient harness.
 *
 * Proves that a rule of each detection type can be created through the
 * framework client after the types are registered, without booting Kibana.
 * Uses the same test utilities as rules_client.test.ts.
 *
 * This file uses synthetic fixture definitions rather than the real
 * security.detection.* schemas.  The authoritative definitions live in the
 * security_detections plugin at x-pack/solutions/security/plugins/security_detections.
 * The fixture pins the same ownership, kind and compilation the real types
 * declare.  Drift between the fixture and the real definitions surfaces as a
 * registration failure at the security_detections plugin's setup, not here.
 *
 * What this file proves is a framework property: that a managed, execution-time,
 * kind-pinned type's create path stamps ownership and persists no query.
 * Security-specific validateFields behavior is tested in the security_detections
 * plugin (step B.9).
 *
 * The plugin-level flag-behavior tests live in the security_detections plugin at
 * x-pack/solutions/security/plugins/security_detections/server/__tests__/plugin.test.ts.
 *
 * Ref: implementation-plan.md "Step 8.1: plugin skeleton and type registration"
 *      implementation-plan.md "Step B.6: cut the framework's dependency on Security behavior"
 */

// Importing ruleModelVersions triggers fromBuilderFieldsManifest() calls that
// populate globalFoldedVersions as a side effect. This import must appear
// before any code that consults globalFoldedVersions (i.e., BuilderTypeRegistry).
import { ruleModelVersions } from './rule_model_versions';

import { z } from '@kbn/zod/v4';
import { ByteSizeValue } from '@kbn/config-schema';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { defineBuilderType } from '@kbn/alerting-v2-rule-builders';

import type { PluginConfig } from '../../config';
import { BuilderTypeRegistry } from '../../lib/builder_types';
import { ArtifactTypeRegistry, registerBuiltinArtifactTypes } from '../../lib/artifact_types';
import { RulesClient } from '../../lib/rules_client';
import { createRulesSavedObjectServiceMock } from '../../lib/services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../../lib/services/user_service/user_service.mock';
import { createRuleEventPublisher } from '../../lib/events/rule_event_publisher/rule_event_publisher.mock';
import { createLoggerService } from '../../lib/services/logger_service/logger_service.mock';

jest.mock('../../lib/rule_executor/schedule', () => {
  const actual = jest.requireActual('../../lib/rule_executor/schedule');
  return {
    ...actual,
    ensureRuleExecutorTaskScheduled: jest.fn().mockResolvedValue({ id: 'task-id' }),
    getRuleExecutorTaskId: jest.fn().mockReturnValue('task:id'),
  };
});

// ---------------------------------------------------------------------------
// Synthetic fixture definitions
//
// These definitions pin ownership: { solution: 'security', domain: 'detection' },
// kind: 'alert', and compilation: 'execution_time' — matching the real types
// exactly.  What this file proves is a framework property: that a managed,
// execution-time, kind-pinned type's create path stamps ownership and persists
// no query.  Security-specific validateFields behavior is tested in the
// security_detections plugin (step B.9).
// ---------------------------------------------------------------------------

const syntheticQuerySchema = z
  .object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    risk_score: z.number().int().min(0).max(100),
    index: z.array(z.string().min(1).max(256)).min(1).max(32),
    query: z.string().min(1).max(8192),
    language: z.enum(['kuery', 'lucene']),
  })
  .strict();

const syntheticQueryDefinition = defineBuilderType({
  type: 'security.detection.query',
  name: 'Custom Query (fixture)',
  description: 'Synthetic fixture reproducing the real type for framework property tests.',
  kind: 'alert',
  ownership: { solution: 'security', domain: 'detection' },
  compilation: 'execution_time',
  builderFieldsSchema: syntheticQuerySchema,
  generateQuery: () => ({ query: { base: 'FROM "logs-*" | LIMIT 100' } }),
});

const syntheticThresholdSchema = z
  .object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    risk_score: z.number().int().min(0).max(100),
    index: z.array(z.string().min(1).max(256)).min(1).max(32),
    query: z.string().max(8192),
    language: z.enum(['kuery', 'lucene']),
    threshold: z
      .object({
        field: z.array(z.string().min(1).max(256)).max(5),
        value: z.number().int().min(1),
        cardinality: z
          .array(
            z
              .object({
                field: z.string().min(1).max(256),
                value: z.number().int().min(0),
              })
              .strict()
          )
          .max(1)
          .optional(),
      })
      .strict(),
  })
  .strict();

const syntheticThresholdDefinition = defineBuilderType({
  type: 'security.detection.threshold',
  name: 'Threshold (fixture)',
  description: 'Synthetic fixture reproducing the real type for framework property tests.',
  kind: 'alert',
  ownership: { solution: 'security', domain: 'detection' },
  compilation: 'execution_time',
  builderFieldsSchema: syntheticThresholdSchema,
  generateQuery: () => ({ query: { base: 'FROM "logs-*" | LIMIT 100' } }),
});

// Sanity: confirm the model version import succeeded (if this is 0 the folds
// won't be registered and every registry.register() call will throw).
// The POC's five model versions ('9'–'13') were squashed into a single '9';
// after step B.5, both detection types share a single manifest, so there is
// exactly one manifest-fold mappings_addition in the squashed entry.
it('ruleModelVersions carries the detection-type fold contribution in the squashed entry', () => {
  const v9 = ruleModelVersions['9'] as {
    changes: Array<{ type: string; addedMappings?: unknown }>;
  };
  expect(v9).toBeDefined();
  // One mappings_addition from the shared manifest fold (both query and threshold
  // are covered by a single detectionRuleBuilderFieldsManifest after step B.5).
  const manifestFoldChanges = v9.changes.filter(
    (c) =>
      c.type === 'mappings_addition' &&
      (c.addedMappings as any)?.metadata?.properties?.builder_fields?.properties !== undefined
  );
  expect(manifestFoldChanges.length).toBe(1); // one shared manifest for both detection types
});

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const detectionConfig: PluginConfig = {
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
} as PluginConfig;

function createDetectionClient(builderTypeRegistry: BuilderTypeRegistry) {
  const rulesSavedObjectService = createRulesSavedObjectServiceMock();
  // Signature-id uniqueness check calls find; return empty so no conflict.
  rulesSavedObjectService.find.mockResolvedValue({
    saved_objects: [],
    total: 0,
    page: 1,
    per_page: 1,
  });
  rulesSavedObjectService.bulkCreate.mockImplementation(async (items) =>
    items.map((item) => ({
      id: item.id,
      attributes: item.attrs,
      version: 'WzEsMV0=',
      references: item.references ?? [],
    }))
  );

  const taskManager = taskManagerMock.createStart();
  taskManager.bulkSchedule.mockImplementation(async (tasks) => tasks as never);

  const { userService } = createUserService();
  const { publisher: ruleEventPublisher } = createRuleEventPublisher();
  const { loggerService } = createLoggerService();
  const artifactTypeRegistry = new ArtifactTypeRegistry();
  registerBuiltinArtifactTypes(artifactTypeRegistry);

  const pluginConfigAccessor =
    coreMock.createPluginInitializerContext<PluginConfig>(detectionConfig).config;

  const client = new RulesClient(
    httpServerMock.createKibanaRequest(),
    rulesSavedObjectService,
    taskManager,
    userService,
    'default',
    pluginConfigAccessor,
    rulesSavedObjectService,
    ruleEventPublisher,
    loggerService,
    artifactTypeRegistry,
    builderTypeRegistry,
    { solution: 'security' } // managed-rule gate requires the Security solution identity
  );

  return { client, rulesSavedObjectService };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('security.detection.query — create via RulesClient', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    registry = new BuilderTypeRegistry();
    registry.register(syntheticQueryDefinition);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a query rule with managed ownership and no stored query', async () => {
    const { client, rulesSavedObjectService } = createDetectionClient(registry);

    const res = await client.createRule({
      data: {
        kind: 'alert',
        metadata: {
          name: 'test-query-rule',
          builder_type: 'security.detection.query',
          builder_fields: {
            index: ['logs-*'],
            query: 'host.name: *',
            language: 'kuery',
            risk_score: 42,
            severity: 'medium',
          },
        },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        recovery: { strategy: 'manual' },
        no_data: { strategy: 'ignore' },
        state_transition: { pending: { count: 0 } },
        // No query: execution-time types compile at run time, not write time.
      },
      options: { id: 'query-rule-id' },
    });

    // Ownership is stamped from the type's registration.
    expect(res.metadata.ownership).toEqual({
      managed: true,
      solution: 'security',
      domain: 'detection',
    });
    expect(res.metadata.builder_type).toBe('security.detection.query');

    // Execution-time types persist no query on the stored attributes.
    const { attrs } = rulesSavedObjectService.bulkCreate.mock.calls[0][0][0];
    expect(attrs.query).toBeUndefined();
    expect(attrs.metadata.builder_fields).toMatchObject({
      query: 'host.name: *',
      language: 'kuery',
      risk_score: 42,
    });
  });
});

describe('security.detection.threshold — create via RulesClient', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    registry = new BuilderTypeRegistry();
    registry.register(syntheticThresholdDefinition);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a threshold rule with managed ownership and no stored query', async () => {
    const { client, rulesSavedObjectService } = createDetectionClient(registry);

    const res = await client.createRule({
      data: {
        kind: 'alert',
        metadata: {
          name: 'test-threshold-rule',
          builder_type: 'security.detection.threshold',
          builder_fields: {
            index: ['logs-*'],
            query: 'event.category: process',
            language: 'kuery',
            risk_score: 73,
            severity: 'high',
            threshold: {
              field: ['source.ip'],
              value: 10,
            },
          },
        },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        recovery: { strategy: 'manual' },
        no_data: { strategy: 'ignore' },
        state_transition: { pending: { count: 0 } },
      },
      options: { id: 'threshold-rule-id' },
    });

    expect(res.metadata.ownership).toEqual({
      managed: true,
      solution: 'security',
      domain: 'detection',
    });
    expect(res.metadata.builder_type).toBe('security.detection.threshold');

    // Execution-time types persist no query on the stored attributes. The
    // threshold type no longer derives grouping.fields (dropped in phase A.1).
    const { attrs } = rulesSavedObjectService.bulkCreate.mock.calls[0][0][0];
    expect(attrs.query).toBeUndefined();
    expect(attrs.grouping).toBeUndefined();
  });
});
