/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import Boom from '@hapi/boom';
import moment from 'moment';
import { ServerSentEventError } from '@kbn/sse-utils';
import {
  createAgentBuilderError,
  AgentBuilderErrorCode,
  isAgentBuilderError,
} from '@kbn/agent-builder-common';
import { SavedObjectsErrorHelpers as SO } from '@kbn/core-saved-objects-server';
import { encode, decode } from './codecs';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';

void test('real AgentBuilder alias, Boom fields, SO helper symbols and cause survive', () => {
  const agent = createAgentBuilderError(AgentBuilderErrorCode.requestAborted, 'fixture-agent', {
    statusCode: 499,
    stage: 'stream',
  });
  Object.assign(agent, { cause: SO.createGenericNotFoundError('fixture', 'one') });
  const restored = decode(encode(agent));
  assert.ok(isAgentBuilderError(restored));
  assert.deepEqual(restored.toJSON(), agent.toJSON());
  assert.ok(
    'cause' in restored && restored.cause instanceof Error && SO.isNotFoundError(restored.cause)
  );
  const boom = Boom.forbidden('fixture-boom', { nested: 'value' });
  boom.output.headers['x-fixture'] = 'present';
  const clonedBoom = decode(encode(boom));
  assert.ok(Boom.isBoom(clonedBoom));
  assert.deepEqual(clonedBoom.output, boom.output);
  assert.deepEqual(clonedBoom.data, boom.data);
  const cases = [
    [SO.createBadRequestError(), SO.isBadRequestError],
    [SO.createInvalidVersionError('x'), SO.isInvalidVersionError],
    [SO.decorateNotAuthorizedError(new Error('fixture')), SO.isNotAuthorizedError],
    [SO.decorateForbiddenError(new Error('fixture')), SO.isForbiddenError],
    [SO.decorateRequestEntityTooLargeError(new Error('fixture')), SO.isRequestEntityTooLargeError],
    [SO.createGenericNotFoundError('fixture', 'one'), SO.isNotFoundError],
    [SO.createConflictError('fixture', 'one'), SO.isConflictError],
    [SO.createTooManyRequestsError('fixture', 'one'), SO.isTooManyRequestsError],
    [SO.decorateEsCannotExecuteScriptError(new Error('fixture')), SO.isEsCannotExecuteScriptError],
    [SO.decorateEsUnavailableError(new Error('fixture')), SO.isEsUnavailableError],
    [SO.decorateGeneralError(new Error('fixture')), SO.isGeneralError],
  ] as const;
  for (const [error, guard] of cases) {
    const cloned = decode(encode(error));
    assert.ok(cloned instanceof Error && guard(cloned));
    assert.ok(Boom.isBoom(cloned));
    assert.deepEqual(cloned.output, error.output);
  }
  const calendar = decode(encode(moment.duration({ months: 1, days: 2 })));
  assert.ok(moment.isDuration(calendar));
  assert.equal(calendar.months(), 1);
  assert.equal(calendar.days(), 2);
});

for (const transport of ['thread', 'process'] as const) {
  void test(
    transport + ': typed errors preserve identity in BOTH boundary directions',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('typedFailure', specifier, 'typedFailure');
      registry.register('catchTyped', specifier, 'catchTyped');
      const host = new ExecutionHost(registry, { transport });
      const base = {
        workloadClass: 'agent',
        principal: 'alice',
        space: 'space-a',
        input: {},
        deadlineMs: 15000,
        capabilities: {},
      };
      try {
        for (const kind of ['sse', 'boom', 'so']) {
          const outcome = await host.run({ ...base, moduleId: 'typedFailure', input: kind });
          assert.equal(outcome.status, 'failure');
          if (outcome.status === 'failure') {
            if (kind === 'sse') {
              assert.ok(isAgentBuilderError(outcome.error));
              assert.equal(outcome.error.code, AgentBuilderErrorCode.requestAborted);
            }
            if (kind === 'boom')
              assert.ok(Boom.isBoom(outcome.error) && outcome.error.output.statusCode === 403);
            if (kind === 'so') assert.ok(SO.isNotFoundError(outcome.error));
          }
          const outcomeBack = await host.run({
            ...base,
            moduleId: 'catchTyped',
            capabilities: {
              fixture: {
                lever: 'capability_bundle',
                handler: async () => {
                  if (kind === 'sse')
                    throw new ServerSentEventError('requestAborted', 'fixture', {});
                  if (kind === 'boom') throw Boom.forbidden('fixture');
                  throw SO.createGenericNotFoundError('fixture', 'one');
                },
              },
            },
          });
          assert.equal(outcomeBack.status, 'success');
          if (outcomeBack.status === 'success')
            assert.equal((outcomeBack.value as Record<string, boolean>)[kind], true);
        }
      } finally {
        await host.stop();
      }
    }
  );
}
