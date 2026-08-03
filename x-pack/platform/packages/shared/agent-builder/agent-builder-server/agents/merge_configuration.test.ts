/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/agent-builder-common';
import {
  mergeAgentConfiguration,
  ADMIN_INSTRUCTIONS_HEADER,
  type AgentBaseConfiguration,
} from './merge_configuration';

describe('mergeAgentConfiguration', () => {
  const fullDelta: AgentConfiguration = {
    instructions: 'delta instructions',
    tools: [{ tool_ids: ['tool-a'] }],
    skill_ids: ['skill-a'],
    enable_elastic_capabilities: true,
    workflow_ids: ['workflow-a'],
    plugin_ids: ['plugin-a'],
    connector_ids: ['connector-a'],
  };

  describe('identity (empty base)', () => {
    it('returns the delta unchanged when base is undefined', () => {
      expect(mergeAgentConfiguration(undefined, fullDelta)).toEqual(fullDelta);
    });

    it('returns the delta unchanged when base is empty', () => {
      expect(mergeAgentConfiguration({}, fullDelta)).toEqual(fullDelta);
    });

    it('preserves undefined optional fields (legacy "undefined means all" semantics)', () => {
      const delta: AgentConfiguration = { tools: [] };
      const merged = mergeAgentConfiguration({}, delta);
      expect(merged.skill_ids).toBeUndefined();
      expect(merged.connector_ids).toBeUndefined();
      expect(merged.instructions).toBeUndefined();
    });
  });

  describe('instructions', () => {
    it('uses the base when the delta has none', () => {
      const merged = mergeAgentConfiguration({ instructions: 'base' }, { tools: [] });
      expect(merged.instructions).toBe('base');
    });

    it('concatenates base-first with the admin delimiter when both are set', () => {
      const merged = mergeAgentConfiguration(
        { instructions: 'base' },
        { tools: [], instructions: 'delta' }
      );
      expect(merged.instructions).toBe(`base\n\n${ADMIN_INSTRUCTIONS_HEADER}\ndelta`);
    });

    it('does not append a dangling delimiter for an empty delta instruction', () => {
      const merged = mergeAgentConfiguration(
        { instructions: 'base' },
        { tools: [], instructions: '' }
      );
      expect(merged.instructions).toBe('base');
    });
  });

  describe('tools', () => {
    it('uses the base selections when the delta has none', () => {
      const merged = mergeAgentConfiguration(
        { tools: [{ tool_ids: ['base-tool'] }] },
        { tools: [] }
      );
      expect(merged.tools).toEqual([{ tool_ids: ['base-tool'] }]);
    });

    it('concatenates base-first and drops exact duplicate selections', () => {
      const merged = mergeAgentConfiguration(
        { tools: [{ tool_ids: ['a'] }, { tool_ids: ['b'] }] },
        { tools: [{ tool_ids: ['b'] }, { tool_ids: ['c'] }] }
      );
      expect(merged.tools).toEqual([{ tool_ids: ['a'] }, { tool_ids: ['b'] }, { tool_ids: ['c'] }]);
    });

    it('collapses to the all-tools selection when either side has the wildcard', () => {
      expect(
        mergeAgentConfiguration({ tools: [{ tool_ids: ['*'] }] }, { tools: [{ tool_ids: ['a'] }] })
          .tools
      ).toEqual([{ tool_ids: ['*'] }]);
      expect(
        mergeAgentConfiguration({ tools: [{ tool_ids: ['a'] }] }, { tools: [{ tool_ids: ['*'] }] })
          .tools
      ).toEqual([{ tool_ids: ['*'] }]);
    });
  });

  describe('id lists (skill_ids / plugin_ids / workflow_ids / connector_ids)', () => {
    it('unions base-first with deduplication', () => {
      const merged = mergeAgentConfiguration(
        { skill_ids: ['s1', 's2'], plugin_ids: ['p1'], workflow_ids: ['w1'] },
        { tools: [], skill_ids: ['s2', 's3'], plugin_ids: ['p2'], workflow_ids: ['w1'] }
      );
      expect(merged.skill_ids).toEqual(['s1', 's2', 's3']);
      expect(merged.plugin_ids).toEqual(['p1', 'p2']);
      expect(merged.workflow_ids).toEqual(['w1']);
    });

    it('is deterministic across calls', () => {
      const base: AgentBaseConfiguration = { skill_ids: ['s1', 's2'] };
      const delta: AgentConfiguration = { tools: [], skill_ids: ['s3', 's2'] };
      expect(mergeAgentConfiguration(base, delta)).toEqual(mergeAgentConfiguration(base, delta));
    });

    it('treats an undefined delta as "add nothing" when the base sets skill_ids', () => {
      const merged = mergeAgentConfiguration({ skill_ids: ['s1'] }, { tools: [] });
      expect(merged.skill_ids).toEqual(['s1']);
    });

    it('keeps skill_ids undefined (all skills) when the base leaves them unset', () => {
      const merged = mergeAgentConfiguration({ instructions: 'base' }, { tools: [] });
      expect(merged.skill_ids).toBeUndefined();
    });
  });

  describe('connector_ids empty vs undefined', () => {
    it('base [] with no delta additions yields [] (zero connectors), not undefined', () => {
      const merged = mergeAgentConfiguration({ connector_ids: [] }, { tools: [] });
      expect(merged.connector_ids).toEqual([]);
    });

    it('base [] unions with the delta allow-list', () => {
      const merged = mergeAgentConfiguration(
        { connector_ids: [] },
        { tools: [], connector_ids: ['github-1', 'slack-1'] }
      );
      expect(merged.connector_ids).toEqual(['github-1', 'slack-1']);
    });

    it('base unset keeps undefined (all connectors) semantics', () => {
      const merged = mergeAgentConfiguration({}, { tools: [] });
      expect(merged.connector_ids).toBeUndefined();
    });
  });

  describe('enable_elastic_capabilities (scalar override)', () => {
    it('uses the base value when the delta leaves it unset', () => {
      expect(
        mergeAgentConfiguration({ enable_elastic_capabilities: false }, { tools: [] })
          .enable_elastic_capabilities
      ).toBe(false);
    });

    it('lets the delta override the base in both directions', () => {
      expect(
        mergeAgentConfiguration(
          { enable_elastic_capabilities: false },
          { tools: [], enable_elastic_capabilities: true }
        ).enable_elastic_capabilities
      ).toBe(true);
      expect(
        mergeAgentConfiguration(
          { enable_elastic_capabilities: true },
          { tools: [], enable_elastic_capabilities: false }
        ).enable_elastic_capabilities
      ).toBe(false);
    });

    it('an injected default true (as applied to chat built-ins) acts as a delta value and overrides a base false', () => {
      // mirrors builtin/provider.ts and converters.ts injecting `?? true` into the delta
      const deltaWithInjectedDefault: AgentConfiguration = {
        tools: [],
        enable_elastic_capabilities: true,
      };
      expect(
        mergeAgentConfiguration({ enable_elastic_capabilities: false }, deltaWithInjectedDefault)
          .enable_elastic_capabilities
      ).toBe(true);
    });
  });

  it('does not mutate its inputs', () => {
    const base: AgentBaseConfiguration = { skill_ids: ['s1'], tools: [{ tool_ids: ['a'] }] };
    const delta: AgentConfiguration = { tools: [{ tool_ids: ['b'] }], skill_ids: ['s2'] };
    mergeAgentConfiguration(base, delta);
    expect(base).toEqual({ skill_ids: ['s1'], tools: [{ tool_ids: ['a'] }] });
    expect(delta).toEqual({ tools: [{ tool_ids: ['b'] }], skill_ids: ['s2'] });
  });
});
