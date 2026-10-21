/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Worker Core config reconstruction.
 * Run: node .../worker_core/reconstruct_config_probe.cts
 *
 * Red: schema.validate({}) and a string-leaf overlay drop numbers, booleans,
 * arrays, optional objects, ByteSizeValue, and Duration.
 * Green: reconstructPluginConfig restores the captured effective config.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ByteSizeValue } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { configSchema as agentConfigSchema } from '@kbn/agent-builder-plugin/server/config';
import { config as executionConfig } from '@kbn/workflows-execution-engine/server/config';
import { config as extensionsConfig } from '@kbn/workflows-extensions/server/config';
import { toPlainConfig } from './policies';
import { reconstructPluginConfig, restoreSchemaInput } from './reconstruct_config';

const context = {
  dev: true,
  prod: false,
  serverless: false,
  dist: false,
  version: '9.0.0',
  branch: 'main',
  buildNum: 1,
  buildSha: 'abc',
  buildShaShort: 'abc',
};

/** The island bug: validate defaults, then copy only string leaves. */
const stringLeafOverlay = (base: unknown, captured: unknown): unknown => {
  if (typeof captured === 'string') return captured;
  if (!captured || typeof captured !== 'object' || Array.isArray(captured)) return base;
  const source =
    base && typeof base === 'object' && !Array.isArray(base)
      ? (base as Record<string, unknown>)
      : {};
  const out: Record<string, unknown> = { ...source };
  for (const [key, child] of Object.entries(captured as Record<string, unknown>)) {
    if (typeof child === 'string') out[key] = child;
    else if (child && typeof child === 'object' && !Array.isArray(child)) {
      out[key] = stringLeafOverlay(source[key], child);
    }
  }
  return out;
};

test('empty capture is rejected so schema defaults are not applied', () => {
  const defaults = executionConfig.schema.validate({}, context) as {
    http: { allowedHosts: string[] };
    maxWorkflowDepth: number;
  };
  assert.deepEqual(defaults.http.allowedHosts, ['*']);
  assert.equal(defaults.maxWorkflowDepth, 10);
  assert.throws(
    () => reconstructPluginConfig('workflowsExecutionEngine', executionConfig.schema, {}, context),
    /worker-core config reconstruction missing for workflowsExecutionEngine/
  );
  assert.throws(
    () => reconstructPluginConfig('agentBuilder', agentConfigSchema, undefined, context),
    /worker-core config reconstruction missing for agentBuilder/
  );
});

test('an empty owner schema accepts a captured empty object', () => {
  const validated = extensionsConfig.schema.validate({}, context);
  assert.deepEqual(validated, {});
  const rebuilt = reconstructPluginConfig(
    'workflowsExtensions',
    extensionsConfig.schema,
    {},
    context
  );
  assert.deepEqual(rebuilt, {});
});

test('workflows capture keeps allowedHosts, maxWorkflowDepth, and ByteSizeValue', () => {
  const typed = executionConfig.schema.validate(
    {
      maxWorkflowDepth: 3,
      http: { allowedHosts: ['example.com'] },
      maxResponseSize: 1024,
      eviction: { minPayloadSize: 2048 },
    },
    context
  ) as {
    http: { allowedHosts: string[] };
    maxWorkflowDepth: number;
    maxResponseSize: ByteSizeValue;
    eviction: { minPayloadSize: ByteSizeValue };
  };
  const captured = toPlainConfig(typed) as {
    http: { allowedHosts: string[] };
    maxWorkflowDepth: number;
    maxResponseSize: { valueInBytes: number };
    eviction: { minPayloadSize: { valueInBytes: number } };
  };
  assert.deepEqual(captured.maxResponseSize, { valueInBytes: 1024 });
  assert.throws(() => executionConfig.schema.validate(captured, context));
  const overlaid = stringLeafOverlay(executionConfig.schema.validate({}, context), captured) as {
    http: { allowedHosts: string[] };
    maxWorkflowDepth: number;
  };
  assert.deepEqual(overlaid.http.allowedHosts, ['*']);
  assert.equal(overlaid.maxWorkflowDepth, 10);

  const rebuilt = reconstructPluginConfig(
    'workflowsExecutionEngine',
    executionConfig.schema,
    captured,
    context
  ) as typeof typed;
  assert.deepEqual(rebuilt.http.allowedHosts, ['example.com']);
  assert.equal(rebuilt.maxWorkflowDepth, 3);
  assert.equal(rebuilt.maxResponseSize.getValueInBytes(), 1024);
  assert.equal(rebuilt.eviction.minPayloadSize.getValueInBytes(), 2048);
});

test('agent builder capture keeps numbers, booleans, arrays, and optional objects', () => {
  const typed = agentConfigSchema.validate(
    {
      enabled: false,
      githubBaseUrl: 'https://example.com/org',
      topSnippets: { numSnippets: 7, numWords: 100 },
      tracing: {
        exporters: [{ url: 'https://example.com/v1/traces', headers: { 'x-test': 'kept' } }],
        opik_distributed_tracing: true,
        scheduledDelay: 250,
      },
      deductive: { register: true },
    },
    context
  );
  const captured = toPlainConfig(typed);
  const defaults = agentConfigSchema.validate({}, context);
  const overlaid = stringLeafOverlay(defaults, captured) as {
    enabled: boolean;
    githubBaseUrl: string;
    topSnippets: { numSnippets: number; numWords: number };
    tracing: { opik_distributed_tracing: boolean; exporters: unknown[] };
    deductive?: { register?: boolean };
  };
  assert.equal(overlaid.enabled, true);
  assert.equal(overlaid.githubBaseUrl, 'https://example.com/org');
  assert.equal(overlaid.topSnippets.numSnippets, 2);
  assert.equal(overlaid.topSnippets.numWords, 750);
  assert.equal(overlaid.tracing.opik_distributed_tracing, false);
  assert.deepEqual(overlaid.tracing.exporters, []);
  assert.notEqual(overlaid.deductive?.register, true);

  const rebuilt = reconstructPluginConfig('agentBuilder', agentConfigSchema, captured, context) as {
    enabled: boolean;
    topSnippets: { numSnippets: number; numWords: number };
    tracing: {
      opik_distributed_tracing: boolean;
      exporters: Array<{ url: string; headers?: Record<string, string> }>;
      scheduledDelay: number;
    };
    deductive?: { register: boolean };
  };
  assert.equal(rebuilt.enabled, false);
  assert.equal(rebuilt.topSnippets.numSnippets, 7);
  assert.equal(rebuilt.topSnippets.numWords, 100);
  assert.equal(rebuilt.tracing.opik_distributed_tracing, true);
  assert.equal(rebuilt.tracing.exporters.length, 1);
  assert.equal(rebuilt.tracing.exporters[0].url, 'https://example.com/v1/traces');
  assert.deepEqual(rebuilt.tracing.exporters[0].headers, { 'x-test': 'kept' });
  assert.equal(rebuilt.tracing.scheduledDelay, 250);
  assert.equal(rebuilt.deductive?.register, true);

  const withoutOptional = { ...(captured as Record<string, unknown>) };
  delete withoutOptional.deductive;
  const omitted = reconstructPluginConfig(
    'agentBuilder',
    agentConfigSchema,
    withoutOptional,
    context
  ) as { deductive?: unknown };
  assert.equal(omitted.deductive, undefined);
});

test('ISO durations become moment Durations only on duration schema nodes', () => {
  const durationSchema = schema.object({
    responseTimeout: schema.duration({ defaultValue: '60s' }),
    dataRetention: schema.string({ defaultValue: '90d' }),
    nested: schema.object({ idle: schema.duration({ defaultValue: '1s' }) }),
  });
  const typed = durationSchema.validate(
    { responseTimeout: '30s', dataRetention: '90d', nested: { idle: '90s' } },
    context
  );
  const captured = toPlainConfig(typed) as {
    responseTimeout: string;
    dataRetention: string;
    nested: { idle: string };
  };
  assert.equal(captured.responseTimeout, 'PT30S');
  assert.equal(captured.dataRetention, '90d');
  assert.equal(captured.nested.idle, 'PT1M30S');
  assert.throws(() => durationSchema.validate(captured, context));
  const rebuilt = reconstructPluginConfig('actions', durationSchema, captured, context) as {
    responseTimeout: { asMilliseconds: () => number };
    dataRetention: string;
    nested: { idle: { asMilliseconds: () => number } };
  };
  assert.equal(rebuilt.responseTimeout.asMilliseconds(), 30000);
  assert.equal(rebuilt.dataRetention, '90d');
  assert.equal(rebuilt.nested.idle.asMilliseconds(), 90000);
  const unguided = restoreSchemaInput({
    requestTimeout: 'PT30S',
    header: 'PT30S',
  }) as { requestTimeout: string; header: string };
  assert.equal(unguided.requestTimeout, 'PT30S');
  assert.equal(unguided.header, 'PT30S');
});

test('ISO-looking strings in headers and allowedHosts stay strings', () => {
  const agentCaptured = {
    enabled: false,
    topSnippets: { numSnippets: 7, numWords: 100 },
    tracing: {
      exporters: [{ url: 'https://example.com/v1/traces', headers: { 'x-test': 'PT30S' } }],
      opik_distributed_tracing: true,
    },
  };
  const everyIso = (value: unknown): unknown => {
    if (typeof value === 'string' && value.startsWith('P')) return 30000;
    if (Array.isArray(value)) return value.map(everyIso);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, everyIso(child)])
      );
    }
    return value;
  };
  assert.throws(() => agentConfigSchema.validate(everyIso(agentCaptured), context));
  const agent = reconstructPluginConfig('agentBuilder', agentConfigSchema, agentCaptured, context) as {
    tracing: { exporters: Array<{ headers?: Record<string, string> }> };
  };
  assert.equal(agent.tracing.exporters[0].headers?.['x-test'], 'PT30S');

  const hostsCaptured = {
    enabled: true,
    maxWorkflowDepth: 3,
    http: { allowedHosts: ['PT30S'] },
  };
  assert.throws(() => executionConfig.schema.validate(everyIso(hostsCaptured), context));
  const hosts = reconstructPluginConfig(
    'workflowsExecutionEngine',
    executionConfig.schema,
    hostsCaptured,
    context
  ) as { http: { allowedHosts: string[] } };
  assert.deepEqual(hosts.http.allowedHosts, ['PT30S']);
});
