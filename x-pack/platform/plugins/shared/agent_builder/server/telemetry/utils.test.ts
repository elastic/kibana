/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import {
  classifySkill,
  getModelsForTelemetry,
  normalizePluginIdForTelemetry,
  normalizeSkillIdForTelemetry,
  normalizeToolIdForTelemetry,
} from './utils';

describe('normalizeToolIdForTelemetry', () => {
  it('returns the original id for tools typed as builtin, regardless of allow-list', () => {
    // A built-in tool registered by another plugin and NOT present in the
    // AGENT_BUILDER_BUILTIN_TOOLS allow-list still keeps its real id.
    expect(
      normalizeToolIdForTelemetry('platform.dashboard.manage_dashboard', ToolType.builtin)
    ).toBe('platform.dashboard.manage_dashboard');
  });

  it('returns the original id for allow-listed built-in tools when no type is provided', () => {
    expect(normalizeToolIdForTelemetry(platformCoreTools.search)).toBe(platformCoreTools.search);
  });

  it('returns the original id for internal framework tools', () => {
    expect(normalizeToolIdForTelemetry('load_skill')).toBe('load_skill');
  });

  it('hashes user-created tools as `custom-<hash>`', () => {
    expect(normalizeToolIdForTelemetry('my-esql-tool', ToolType.esql)).toBe(
      normalizeToolIdForTelemetry('my-esql-tool')
    );
    expect(normalizeToolIdForTelemetry('my-esql-tool', ToolType.esql)).toMatch(
      /^custom-[0-9a-f]+$/
    );
  });

  it('hashes unknown tool ids when no type is provided and not allow-listed', () => {
    expect(normalizeToolIdForTelemetry('platform.dashboard.manage_dashboard')).toMatch(
      /^custom-[0-9a-f]+$/
    );
  });
});

describe('normalizePluginIdForTelemetry', () => {
  it('returns undefined when no plugin id is provided', () => {
    expect(normalizePluginIdForTelemetry()).toBeUndefined();
    expect(normalizePluginIdForTelemetry(undefined)).toBeUndefined();
    expect(normalizePluginIdForTelemetry('')).toBeUndefined();
  });

  it('returns a stable hashed label for plugin ids', () => {
    expect(normalizePluginIdForTelemetry('plugin-uuid-1')).toBe('plugin-f3a4ba6782682a47');
  });

  it('returns the same hash for the same input across calls', () => {
    const a = normalizePluginIdForTelemetry('plugin-uuid-1');
    const b = normalizePluginIdForTelemetry('plugin-uuid-1');
    expect(a).toBe(b);
  });
});

describe('normalizeSkillIdForTelemetry', () => {
  it('returns the original id for read-only (built-in) skills', () => {
    expect(normalizeSkillIdForTelemetry({ id: 'builtin-skill-1', readonly: true })).toBe(
      'builtin-skill-1'
    );
  });

  it('hashes plugin-backed skill ids as `<plugin-hash>-<skill-hash>`', () => {
    expect(
      normalizeSkillIdForTelemetry({
        id: 'plugin-skill',
        readonly: false,
        plugin_id: 'plugin-uuid-1',
      })
    ).toBe('plugin-f3a4ba6782682a47-eabadf06389e747c');
  });

  it('hashes plain custom skill ids as `custom-<hash>`', () => {
    expect(normalizeSkillIdForTelemetry({ id: 'custom-skill-1', readonly: false })).toBe(
      'custom-a1c01b755b74d7bd'
    );
  });

  it('returns the original id when readonly even if a plugin_id is also set (readonly takes precedence)', () => {
    expect(
      normalizeSkillIdForTelemetry({
        id: 'builtin-skill-1',
        readonly: true,
        plugin_id: 'plugin-uuid-1',
      })
    ).toBe('builtin-skill-1');
  });
});

describe('classifySkill', () => {
  it('classifies plugin-backed skills as plugin/plugin', () => {
    expect(
      classifySkill({ readonly: false, plugin_id: 'plugin-uuid-1', basePath: '/skills/anything' })
    ).toEqual({ origin: 'plugin', solution_area: 'plugin' });
  });

  it('classifies non-readonly, non-plugin skills as custom/custom', () => {
    expect(classifySkill({ readonly: false, basePath: '/skills/anything' })).toEqual({
      origin: 'custom',
      solution_area: 'custom',
    });
  });

  it('classifies readonly skills as builtin and derives the solution_area from basePath', () => {
    expect(classifySkill({ readonly: true, basePath: 'skills/security/foo' })).toEqual({
      origin: 'builtin',
      solution_area: 'security',
    });
    expect(classifySkill({ readonly: true, basePath: 'skills/observability/bar' })).toEqual({
      origin: 'builtin',
      solution_area: 'observability',
    });
    expect(classifySkill({ readonly: true, basePath: 'skills/ml/anomaly_detection' })).toEqual({
      origin: 'builtin',
      solution_area: 'ml',
    });
    expect(classifySkill({ readonly: true, basePath: 'skills/search/baz' })).toEqual({
      origin: 'builtin',
      solution_area: 'search',
    });
    expect(classifySkill({ readonly: true, basePath: 'skills/platform/qux' })).toEqual({
      origin: 'builtin',
      solution_area: 'platform',
    });
  });

  it('normalizes leading slashes in basePath when classifying built-in skills', () => {
    expect(classifySkill({ readonly: true, basePath: '/skills/security/foo' })).toEqual({
      origin: 'builtin',
      solution_area: 'security',
    });
    expect(classifySkill({ readonly: true, basePath: '///skills/platform/qux' })).toEqual({
      origin: 'builtin',
      solution_area: 'platform',
    });
  });

  it('returns `unknown` for built-in skills whose basePath does not match a known prefix', () => {
    expect(classifySkill({ readonly: true, basePath: 'skills/something-else/foo' })).toEqual({
      origin: 'builtin',
      solution_area: 'unknown',
    });
    expect(classifySkill({ readonly: true, basePath: '' })).toEqual({
      origin: 'builtin',
      solution_area: 'unknown',
    });
  });
});

describe('getModelsForTelemetry', () => {
  const usage = { connector_id: 'c1', llm_calls: 1, input_tokens: 1, output_tokens: 1 };
  const connector = (connectorId: string, model?: string) => ({
    connector_id: connectorId,
    model,
    llm_calls: 1,
    input_tokens: 1,
    output_tokens: 1,
  });

  it('returns the distinct models in order of appearance', () => {
    expect(
      getModelsForTelemetry({
        ...usage,
        connectors: [connector('a', 'm1'), connector('b', 'm2'), connector('c', 'm1')],
      })
    ).toEqual({ models: ['m1', 'm2'], models_count: 2 });
  });

  it('ignores connectors that report no model', () => {
    expect(
      getModelsForTelemetry({ ...usage, connectors: [connector('a'), connector('b', 'm1')] })
    ).toEqual({ models: ['m1'], models_count: 1 });
  });

  it('returns nothing without a breakdown or without any model', () => {
    expect(getModelsForTelemetry(usage)).toEqual({});
    expect(getModelsForTelemetry({ ...usage, connectors: [connector('a')] })).toEqual({});
  });
});
