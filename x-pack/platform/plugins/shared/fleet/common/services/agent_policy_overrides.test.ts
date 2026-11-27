/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDeniedAgentPolicyOverrideKey,
  sanitizeAgentPolicyOverrides,
} from './agent_policy_overrides';

describe('agent policy overrides', () => {
  describe('getDeniedAgentPolicyOverrideKey', () => {
    it.each([
      ['inputs', 'inputs'],
      ['output_permissions.foo', 'output_permissions'],
      ['receivers', 'receivers'],
      ['exporters', 'exporters'],
      ['processors.batch', 'processors'],
      ['connectors', 'connectors'],
      ['extensions.pprof.save_to_file', 'extensions'],
      ['service.pipelines', 'service'],
    ])('denies %s', (key, expected) => {
      expect(getDeniedAgentPolicyOverrideKey(key)).toBe(expected);
    });

    it.each(['outputs', 'fleet', 'agent.logging.level', 'servicefoo', 'agent.service'])(
      'allows %s',
      (key) => {
        expect(getDeniedAgentPolicyOverrideKey(key)).toBeUndefined();
      }
    );
  });

  describe('sanitizeAgentPolicyOverrides', () => {
    it('removes denied keys and keeps the others', () => {
      expect(
        sanitizeAgentPolicyOverrides({
          receivers: {},
          'extensions.pprof.save_to_file': '/tmp/x',
          outputs: { default: { hosts: ['https://es:9200'] } },
          'agent.logging.level': 'debug',
        })
      ).toEqual({
        overrides: {
          outputs: { default: { hosts: ['https://es:9200'] } },
          'agent.logging.level': 'debug',
        },
        removedKeys: ['receivers', 'extensions.pprof.save_to_file'],
      });
    });
  });
});
