/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { BuiltinAgentRegistry } from './registry';
import { createBuiltinAgentRegistry } from './registry';

describe('BuiltinAgentRegistry', () => {
  let registry: BuiltinAgentRegistry;

  beforeEach(() => {
    registry = createBuiltinAgentRegistry();
  });

  const mockAgent: BuiltInAgentDefinition = {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent',
    labels: ['test'],
    avatar_icon: 'agentApp',
    avatar_color: '#0070f3',
    avatar_symbol: '🤖',
    configuration: {
      instructions: 'You are a helpful test agent',
      tools: [{ tool_ids: ['test-tool-1', 'test-tool-2'] }],
    },
  };

  describe('register', () => {
    it('should register an agent', () => {
      registry.register(mockAgent);
      expect(registry.list()).toEqual([mockAgent]);
    });

    it('should throw if the agent id is already registered', () => {
      registry.register(mockAgent);
      expect(() => registry.register(mockAgent)).toThrowErrorMatchingInlineSnapshot(
        `"Agent with id test-agent already registered"`
      );
    });

    it('should throw if the agent id is not valid', () => {
      expect(() =>
        registry.register({
          ...mockAgent,
          id: '.invalid_id' as any,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid agent id: \\".invalid_id\\": Agent ids must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, hyphens and underscores"`
      );
    });
  });

  describe('has', () => {
    it('should return true when agent exists', () => {
      registry.register(mockAgent);
      const exists = registry.has('test-agent');
      expect(exists).toBe(true);
    });

    it('should return false when agent does not exist', () => {
      registry.register(mockAgent);
      const exists = registry.has('non-existent-agent');
      expect(exists).toBe(false);
    });
  });

  describe('get', () => {
    it('should return the agent when it exists', () => {
      registry.register(mockAgent);
      const agent = registry.get('test-agent');
      expect(agent).toEqual(mockAgent);
    });

    it('should return undefined when agent does not exist', () => {
      registry.register(mockAgent);
      expect(registry.get('non-existent-agent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all registered agents', () => {
      const mockAgent1: BuiltInAgentDefinition = {
        id: 'test-agent-1',
        name: 'Test Agent 1',
        description: 'A test agent',
        configuration: {
          tools: [{ tool_ids: ['tool1'] }],
        },
      };

      const mockAgent2: BuiltInAgentDefinition = {
        id: 'test-agent-2',
        name: 'Test Agent 2',
        description: 'Another test agent',
        labels: ['production'],
        configuration: {
          instructions: 'You are a production agent',
          tools: [{ tool_ids: ['tool2', 'tool3'] }],
        },
      };

      registry.register(mockAgent1);
      registry.register(mockAgent2);

      const agents = registry.list();
      expect(agents).toEqual([mockAgent1, mockAgent2]);
    });

    it('should return empty array when no agents are registered', () => {
      const agents = registry.list();
      expect(agents).toEqual([]);
    });

    it('should return agents in registration order', () => {
      const agents = [
        { ...mockAgent, id: 'agent-1', name: 'Agent 1' },
        { ...mockAgent, id: 'agent-2', name: 'Agent 2' },
        { ...mockAgent, id: 'agent-3', name: 'Agent 3' },
      ];

      agents.forEach((agent) => registry.register(agent));
      const listedAgents = registry.list();
      expect(listedAgents).toEqual(agents);
    });
  });
});
