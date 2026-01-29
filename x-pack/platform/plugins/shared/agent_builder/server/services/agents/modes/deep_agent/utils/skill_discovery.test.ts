/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/agent-builder-common/skills';
import { z } from '@kbn/zod';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import {
  createSkillContext,
  serializeSkillContext,
  deserializeSkillContext,
  recordSkillInvocation,
  discoverSkills,
  extractToolsFromSkill,
  generateSkillPrompt,
  generateSkillSummary,
  getToolSchema,
  findSkillForTool,
  groupSkillsByDomain,
} from './skill_discovery';

// Create a mock tool that matches the DynamicStructuredTool interface
const createMockTool = (
  name: string,
  description: string = 'A test tool'
): DynamicStructuredTool => {
  const schema = z.object({
    query: z.string().describe('The query string'),
    limit: z.number().optional().describe('Max results'),
  });

  return {
    name,
    description,
    schema,
    func: async () => 'result',
    invoke: async () => 'result',
    call: async () => 'result',
  } as unknown as DynamicStructuredTool;
};

const createMockSkill = (namespace: string, name: string, toolCount: number = 1): Skill => {
  const tools = Array.from({ length: toolCount }, (_, i) =>
    createMockTool(`${namespace}.tool_${i}`, `Tool ${i} for ${name}`)
  );

  return {
    namespace,
    name,
    description: `${name} skill for testing`,
    content: `This skill provides ${name} functionality`,
    tools,
  };
};

describe('skill_discovery', () => {
  describe('createSkillContext', () => {
    it('creates an empty skill context', () => {
      const context = createSkillContext();

      expect(context.activeSkillNamespace).toBeUndefined();
      expect(context.discoveredSkills.size).toBe(0);
      expect(context.invocationHistory).toHaveLength(0);
      expect(context.cachedSchemas.size).toBe(0);
    });
  });

  describe('serializeSkillContext / deserializeSkillContext', () => {
    it('serializes and deserializes skill context correctly', () => {
      const context = createSkillContext();
      context.activeSkillNamespace = 'security.alerts';
      context.discoveredSkills.add('security.alerts');
      context.discoveredSkills.add('platform.search');
      context.invocationHistory.push({
        skillNamespace: 'security.alerts',
        toolName: 'get_alerts',
        timestamp: 1234567890,
        success: true,
      });

      const serialized = serializeSkillContext(context);
      const deserialized = deserializeSkillContext(serialized);

      expect(deserialized.activeSkillNamespace).toBe('security.alerts');
      expect(deserialized.discoveredSkills.has('security.alerts')).toBe(true);
      expect(deserialized.discoveredSkills.has('platform.search')).toBe(true);
      expect(deserialized.invocationHistory).toHaveLength(1);
      expect(deserialized.invocationHistory[0].toolName).toBe('get_alerts');
    });

    it('handles invalid serialized data gracefully', () => {
      const context = deserializeSkillContext('invalid json');

      expect(context.activeSkillNamespace).toBeUndefined();
      expect(context.discoveredSkills.size).toBe(0);
    });
  });

  describe('recordSkillInvocation', () => {
    it('records a skill invocation and updates context', () => {
      const context = createSkillContext();

      const updatedContext = recordSkillInvocation(context, {
        skillNamespace: 'security.alerts',
        toolName: 'get_alerts',
        success: true,
      });

      expect(updatedContext.activeSkillNamespace).toBe('security.alerts');
      expect(updatedContext.discoveredSkills.has('security.alerts')).toBe(true);
      expect(updatedContext.invocationHistory).toHaveLength(1);
      expect(updatedContext.invocationHistory[0].timestamp).toBeDefined();
    });

    it('limits invocation history to 50 entries', () => {
      let context = createSkillContext();

      // Add 60 invocations
      for (let i = 0; i < 60; i++) {
        context = recordSkillInvocation(context, {
          skillNamespace: `skill.${i}`,
          toolName: `tool_${i}`,
          success: true,
        });
      }

      expect(context.invocationHistory.length).toBeLessThanOrEqual(50);
    });
  });

  describe('discoverSkills', () => {
    const skills: Skill[] = [
      createMockSkill('security.alerts', 'Security Alerts', 3),
      createMockSkill('security.risk_score', 'Risk Score', 2),
      createMockSkill('platform.search', 'Platform Search', 1),
      createMockSkill('observability.apm', 'APM Monitoring', 2),
    ];

    it('returns all skills when no query is provided', () => {
      const discovered = discoverSkills(skills);

      expect(discovered).toHaveLength(4);
      expect(discovered.every((s) => s.relevanceScore === 1)).toBe(true);
    });

    it('filters and ranks skills by query relevance', () => {
      const discovered = discoverSkills(skills, 'security alerts');

      expect(discovered[0].namespace).toBe('security.alerts');
      expect(discovered[0].relevanceScore).toBeGreaterThan(0);
    });

    it('includes tool count in results', () => {
      const discovered = discoverSkills(skills);

      const alertsSkill = discovered.find((s) => s.namespace === 'security.alerts');
      expect(alertsSkill?.toolCount).toBe(3);
    });
  });

  describe('extractToolsFromSkill', () => {
    it('extracts tool information from a skill', () => {
      const skill = createMockSkill('test.skill', 'Test Skill', 2);
      const tools = extractToolsFromSkill(skill);

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('test.skill.tool_0');
      expect(tools[0].description).toBeDefined();
      expect(tools[0].schema).toBeDefined();
    });
  });

  describe('generateSkillPrompt', () => {
    it('generates a skill prompt with tool information', () => {
      const skill = createMockSkill('security.alerts', 'Security Alerts', 2);
      const prompt = generateSkillPrompt(skill);

      expect(prompt).toContain('Security Alerts');
      expect(prompt).toContain('security.alerts');
      expect(prompt).toContain('invoke_skill');
      expect(prompt).toContain('Available Tools (2)');
    });

    it('includes schemas when requested', () => {
      const skill = createMockSkill('test.skill', 'Test', 1);
      const prompt = generateSkillPrompt(skill, true);

      expect(prompt).toContain('Schema:');
    });
  });

  describe('generateSkillSummary', () => {
    it('generates a summary of available skills', () => {
      const skills: Skill[] = [
        createMockSkill('security.alerts', 'Security Alerts', 3),
        createMockSkill('platform.search', 'Platform Search', 1),
      ];

      const summary = generateSkillSummary(skills);

      expect(summary).toContain('Available Skills (2)');
      expect(summary).toContain('security.alerts');
      expect(summary).toContain('platform.search');
    });

    it('returns a message when no skills available', () => {
      const summary = generateSkillSummary([]);

      expect(summary).toContain('No skills are currently available');
    });
  });

  describe('getToolSchema', () => {
    it('returns the schema for a tool', () => {
      const skills: Skill[] = [createMockSkill('test.skill', 'Test', 1)];

      const schema = getToolSchema(skills, 'test.skill.tool_0');

      expect(schema).toBeDefined();
      expect((schema as any).properties).toHaveProperty('query');
    });

    it('returns undefined for unknown tools', () => {
      const skills: Skill[] = [createMockSkill('test.skill', 'Test', 1)];

      const schema = getToolSchema(skills, 'unknown.tool');

      expect(schema).toBeUndefined();
    });
  });

  describe('findSkillForTool', () => {
    it('finds the skill containing a tool', () => {
      const skills: Skill[] = [
        createMockSkill('security.alerts', 'Security Alerts', 2),
        createMockSkill('platform.search', 'Platform Search', 1),
      ];

      const skill = findSkillForTool(skills, 'security.alerts.tool_0');

      expect(skill?.namespace).toBe('security.alerts');
    });

    it('returns undefined for unknown tools', () => {
      const skills: Skill[] = [createMockSkill('test.skill', 'Test', 1)];

      const skill = findSkillForTool(skills, 'unknown.tool');

      expect(skill).toBeUndefined();
    });
  });

  describe('groupSkillsByDomain', () => {
    it('groups skills by their domain prefix', () => {
      const skills: Skill[] = [
        createMockSkill('security.alerts', 'Security Alerts', 1),
        createMockSkill('security.risk_score', 'Risk Score', 1),
        createMockSkill('platform.search', 'Platform Search', 1),
        createMockSkill('observability.apm', 'APM', 1),
      ];

      const grouped = groupSkillsByDomain(skills);

      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped.security).toHaveLength(2);
      expect(grouped.platform).toHaveLength(1);
      expect(grouped.observability).toHaveLength(1);
    });

    it('handles skills without dots in namespace', () => {
      const skills: Skill[] = [createMockSkill('simple', 'Simple Skill', 1)];

      const grouped = groupSkillsByDomain(skills);

      expect(grouped.simple).toHaveLength(1);
    });
  });
});
