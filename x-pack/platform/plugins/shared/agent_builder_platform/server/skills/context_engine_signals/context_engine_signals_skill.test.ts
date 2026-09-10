/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { contextEngineSignalsSkill } from './context_engine_signals_skill';

describe('contextEngineSignalsSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(contextEngineSignalsSkill.id).toBe('context-engine-signals');
    expect(contextEngineSignalsSkill.name).toBe('context-engine-signals');
    expect(contextEngineSignalsSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(contextEngineSignalsSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(contextEngineSignalsSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof contextEngineSignalsSkill.content).toBe('string');
    expect(contextEngineSignalsSkill.content.length).toBeGreaterThan(0);
  });

  it('binds only what reading signals needs', async () => {
    const toolIds = (await contextEngineSignalsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([platformCoreTools.executeEsql, platformCoreTools.listIndices]);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await contextEngineSignalsSkill.getRegistryTools?.()) ?? [];

    const referencedToolIds = [
      ...new Set(
        [
          ...contextEngineSignalsSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map(([match]) => match)
      ),
    ];

    expect(referencedToolIds.filter((toolId) => !boundTools.includes(toolId))).toEqual([]);
  });

  describe('content', () => {
    const { content } = contextEngineSignalsSkill;

    it('documents the signals index and the three classification tags', () => {
      expect(content).toContain('context-engine-signals-*');
      expect(content).toContain('query_error');
      expect(content).toContain('empty_retrieval');
      expect(content).toContain('coverage_gap');
    });

    it('matches tags with MV_CONTAINS, never with a comparison operator', () => {
      // `tags` is multi-valued. A comparison operator applied to a multi-valued field evaluates to
      // null, so `tags == "<tag>"` matches only signals carrying that tag and no other — silently
      // dropping every multi-tag signal. Elasticsearch reports this as a warning, and execute_esql
      // does not surface warnings, so a regression here is invisible at runtime.
      expect(content).not.toMatch(/\btags\s*(==|!=)/);
      expect(content).toContain('MV_CONTAINS(tags,');
    });

    it('explains that flattened sub-fields need field_extract in ES|QL', () => {
      expect(content).toContain('flattened');
      expect(content).toContain('field_extract(data, ');
    });

    it('requires a denominator, without which a tagged count means nothing', () => {
      expect(content).toContain('Count the denominator');
    });

    it('derives the traces index from the signal rather than the current space', () => {
      expect(content).toContain('traces-agent_builder.otel-');
      expect(content).toContain('METADATA _index');
    });

    it('points at the traces skill rather than restating how the traces index is shaped', () => {
      expect(content).toContain('agent-builder-traces');
    });

    it('tells the agent to prefer the signals handed to it by the run', () => {
      expect(content).toContain('Prefer the signals you were given');
    });

    it('states the limits, so silence is not read as health', () => {
      expect(content).toContain('What signals cannot tell you');
      expect(content).toContain('No signals is not evidence of health');
    });

    it('points at the analysis skill for deciding what to change', () => {
      expect(content).toContain('analyze-and-improve');
    });
  });
});
