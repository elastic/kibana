/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { apiError, createContextManager } from '../test_helpers';
import { matchesPlatformId, resolveTarget } from './preflight';

const AGENTS = 'GET /internal/osquery/fleet_wrapper/agents';

const fleet = (platforms: Array<[string, number]>, total = 0) => ({
  total,
  groups: { platforms: platforms.map(([id, size]) => ({ id, name: id, size })) },
});

const codeOf = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e) => e
  );
  expect(error).toBeInstanceOf(ExecutionError);

  return (error as ExecutionError).details?.code;
};

describe('preflight', () => {
  describe('matchesPlatformId', () => {
    it.each([
      ['ubuntu', 'linux', true],
      ['centos', 'linux', true],
      ['darwin', 'linux', false],
      ['windows', 'linux', false],
      ['darwin', 'darwin', true],
      ['windows', 'windows', true],
      ['ubuntu', 'windows', false],
    ] as const)('%s matches %s: %s', (fleetPlatform, platformId, expected) => {
      expect(matchesPlatformId(fleetPlatform, platformId)).toBe(expected);
    });
  });

  describe('resolveTarget', () => {
    it('passes agent_ids through without any call', async () => {
      const contextManager = createContextManager({});

      expect(await resolveTarget(contextManager, { agent_ids: ['a'] })).toEqual({
        target: { agent_ids: ['a'] },
        agentCount: 1,
      });
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });

    it('counts online agents of the policies with an escaped policy filter', async () => {
      const contextManager = createContextManager({ [AGENTS]: () => fleet([], 1000) });

      expect(
        await resolveTarget(contextManager, { agent_policy_ids: ['pol" or true or "'] })
      ).toEqual({ target: { agent_policy_ids: ['pol" or true or "'] }, agentCount: 1000 });

      const { kuery } = contextManager.callKibanaApi.mock.calls[0][0].query as { kuery: string };
      expect(kuery).toContain('(status:online OR status:degraded)');
      expect(kuery).not.toContain('pol" or true');
    });

    it('fails with TARGET_LIMIT_EXCEEDED above 1000 agents for policies', async () => {
      const contextManager = createContextManager({ [AGENTS]: () => fleet([], 1001) });

      expect(await codeOf(resolveTarget(contextManager, { agent_policy_ids: ['p'] }))).toBe(
        'TARGET_LIMIT_EXCEEDED'
      );
    });

    it('expands linux to every Linux distribution of the online agents', async () => {
      const contextManager = createContextManager({
        [AGENTS]: () =>
          fleet([
            ['ubuntu', 3],
            ['centos', 2],
            ['darwin', 4],
            ['windows', 5],
          ]),
      });

      expect(await resolveTarget(contextManager, { agent_platforms: ['linux'] })).toEqual({
        target: { agent_platforms: ['ubuntu', 'centos'] },
        agentCount: 5,
      });
    });

    it('maps darwin and windows to themselves', async () => {
      const contextManager = createContextManager({
        [AGENTS]: () =>
          fleet([
            ['ubuntu', 3],
            ['darwin', 4],
            ['windows', 5],
          ]),
      });

      expect(
        await resolveTarget(contextManager, { agent_platforms: ['darwin', 'windows'] })
      ).toEqual({ target: { agent_platforms: ['darwin', 'windows'] }, agentCount: 9 });
    });

    it('never forwards a Fleet platform value with query characters', async () => {
      const contextManager = createContextManager({
        [AGENTS]: () =>
          fleet([
            ['ubuntu', 1],
            ['x) or (status:*', 9],
          ]),
      });

      expect(await resolveTarget(contextManager, { agent_platforms: ['linux'] })).toEqual({
        target: { agent_platforms: ['ubuntu'] },
        agentCount: 1,
      });
    });

    it('fails with AGENTS_NOT_IN_SPACE when no online agent runs on the platforms', async () => {
      const contextManager = createContextManager({ [AGENTS]: () => fleet([['ubuntu', 2]]) });

      expect(await codeOf(resolveTarget(contextManager, { agent_platforms: ['windows'] }))).toBe(
        'AGENTS_NOT_IN_SPACE'
      );
    });

    it('counts the expanded platforms against the ceiling', async () => {
      const contextManager = createContextManager({
        [AGENTS]: () =>
          fleet([
            ['ubuntu', 600],
            ['centos', 401],
            ['windows', 5000],
          ]),
      });

      expect(await codeOf(resolveTarget(contextManager, { agent_platforms: ['linux'] }))).toBe(
        'TARGET_LIMIT_EXCEEDED'
      );
    });

    it('maps a 403 on the agent read to MISSING_PRIVILEGE', async () => {
      const contextManager = createContextManager({ [AGENTS]: () => apiError(403) });

      expect(await codeOf(resolveTarget(contextManager, { agent_platforms: ['linux'] }))).toBe(
        'MISSING_PRIVILEGE'
      );
    });
  });
});
