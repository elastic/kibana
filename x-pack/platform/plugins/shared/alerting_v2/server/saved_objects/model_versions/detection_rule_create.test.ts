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
 * The plugin-level flag-behavior tests live in the security_detections plugin at
 * x-pack/solutions/security/plugins/security_detections/server/__tests__/plugin.test.ts.
 *
 * Ref: implementation-plan.md "Step 8.1: plugin skeleton and type registration"
 */

// Importing ruleModelVersions triggers fromBuilderManifest() calls that
// populate globalFoldedVersions as a side effect. This import must appear
// before any code that consults globalFoldedVersions (i.e., BuilderTypeRegistry).
import { ruleModelVersions } from './rule_model_versions';

import { ByteSizeValue } from '@kbn/config-schema';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  securityDetectionQuery,
  securityDetectionThreshold,
} from '@kbn/security-detection-rule-schema';
import { defineBuilderType } from '@kbn/alerting-v2-rule-builders';

import type { PluginConfig } from '../../config';
import { BuilderTypeRegistry } from '../../lib/builder_types';
import { ArtifactTypeRegistry, registerBuiltinArtifactTypes } from '../../lib/artifact_types';
import { RulesClient } from '../../lib/rules_client';
import { createRulesSavedObjectServiceMock } from '../../lib/services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../../lib/services/user_service/user_service.mock';
import { createRuleEventPublisher } from '../../lib/events/rule_event_publisher/rule_event_publisher.mock';
import { createLoggerService } from '../../lib/services/logger_service/logger_service.mock';

jest.mock('../../lib/rule_executor/schedule', () => ({
  ensureRuleExecutorTaskScheduled: jest.fn().mockResolvedValue({ id: 'task-id' }),
  getRuleExecutorTaskId: jest.fn().mockReturnValue('task:id'),
}));

// Sanity: confirm the model version import succeeded (if this is 0 the folds
// won't be registered and every registry.register() call will throw).
it('ruleModelVersions contains both detection-type fold entries', () => {
  expect(Object.keys(ruleModelVersions)).toContain('7'); // security.detection.query fold
  expect(Object.keys(ruleModelVersions)).toContain('8'); // security.detection.threshold fold
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
  esql: { responseFormat: 'json' },
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
    taskManagerMock.createStart(),
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
    registry.register(defineBuilderType(securityDetectionQuery));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a query rule with managed ownership and no stored query', async () => {
    const { client, rulesSavedObjectService } = createDetectionClient(registry);
    rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'query-rule-id' });

    const res = await client.createRule({
      data: {
        kind: 'signal',
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
        recovery_strategy: 'none',
        no_data_strategy: 'none',
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
    const { attrs } = rulesSavedObjectService.create.mock.calls[0][0];
    expect(attrs.query).toBeUndefined();
    expect(attrs.metadata.builder_fields).toMatchObject({
      query: 'host.name: *',
      language: 'kuery',
      risk_score: 42,
    });
  });

  it('rejects a whitespace-only query (validateFields hook)', async () => {
    const { client } = createDetectionClient(registry);

    await expect(
      client.createRule({
        data: {
          kind: 'signal',
          metadata: {
            name: 'bad-query',
            builder_type: 'security.detection.query',
            builder_fields: {
              index: ['logs-*'],
              query: '   ', // whitespace only
              language: 'kuery',
              risk_score: 10,
              severity: 'low',
            },
          },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          recovery_strategy: 'none',
          no_data_strategy: 'none',
        },
      })
    ).rejects.toThrow();
  });
});

describe('security.detection.threshold — create via RulesClient', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    registry = new BuilderTypeRegistry();
    registry.register(defineBuilderType(securityDetectionThreshold));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a threshold rule with managed ownership and no stored query', async () => {
    const { client, rulesSavedObjectService } = createDetectionClient(registry);
    rulesSavedObjectService.create.mockResolvedValueOnce({ id: 'threshold-rule-id' });

    const res = await client.createRule({
      data: {
        kind: 'signal',
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
        recovery_strategy: 'none',
        no_data_strategy: 'none',
      },
      options: { id: 'threshold-rule-id' },
    });

    expect(res.metadata.ownership).toEqual({
      managed: true,
      solution: 'security',
      domain: 'detection',
    });
    expect(res.metadata.builder_type).toBe('security.detection.threshold');

    // Threshold derives grouping.fields from threshold.field at write time.
    const { attrs } = rulesSavedObjectService.create.mock.calls[0][0];
    expect(attrs.query).toBeUndefined();
    expect(attrs.grouping?.fields).toEqual(['source.ip']);
  });

  it('rejects overlapping cardinality and threshold fields (validateFields hook)', async () => {
    const { client } = createDetectionClient(registry);

    await expect(
      client.createRule({
        data: {
          kind: 'signal',
          metadata: {
            name: 'bad-threshold',
            builder_type: 'security.detection.threshold',
            builder_fields: {
              index: ['logs-*'],
              query: 'event.category: process',
              language: 'kuery',
              risk_score: 50,
              severity: 'medium',
              threshold: {
                field: ['source.ip'],
                value: 5,
                cardinality: [{ field: 'source.ip', value: 3 }], // same as threshold.field
              },
            },
          },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          recovery_strategy: 'none',
          no_data_strategy: 'none',
        },
      })
    ).rejects.toThrow();
  });
});
