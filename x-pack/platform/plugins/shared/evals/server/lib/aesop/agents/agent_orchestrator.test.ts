/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, EMPTY, throwError } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import { AgentOrchestrator } from './agent_orchestrator';

// Helper: build the exact `message_complete` event shape Agent Builder emits
// at runtime. The orchestrator filters on this type and reads
// `event.data.message_content`; we keep all fixtures going through this
// helper so a future event-shape change only needs one edit.
const messageComplete = (content: string) => ({
  type: ChatEventType.messageComplete,
  data: {
    message_id: 'msg-1',
    message_content: content,
  },
});

describe('AgentOrchestrator', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  const createMockAgentBuilderStart = (events$Response: any) => ({
    execution: {
      executeAgent: jest.fn().mockResolvedValue({
        executionId: 'test-exec-123',
        events$: events$Response,
      }),
    },
  });

  const mockRequest = {} as any;

  beforeEach(() => jest.clearAllMocks());

  describe('executeAgent', () => {
    it('extracts response from message_complete event', async () => {
      const events$ = of(messageComplete('Hello world'));
      const agentBuilder = createMockAgentBuilderStart(events$);

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'test-connector',
        logger: mockLogger,
      });

      const result = await orchestrator.executeAgent('test-agent', 'test message');

      expect(result).toBe('Hello world');
      expect(agentBuilder.execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          request: mockRequest,
          params: expect.objectContaining({
            agentId: 'test-agent',
            connectorId: 'test-connector',
            nextInput: { message: 'test message' },
          }),
        })
      );
    });

    it('ignores non-message_complete events and returns empty string', async () => {
      // The orchestrator only consumes `message_complete`. Conversation
      // updates, reasoning chunks, tool results etc. must be silently
      // ignored — failing to filter them caused EmptyError in production.
      const events$ = of({
        type: ChatEventType.reasoning,
        data: { reasoning: 'thinking...' },
      });
      const agentBuilder = createMockAgentBuilderStart(events$);

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.executeAgent('agent1', 'go');
      expect(result).toBe('');
    });

    it('returns empty string on stream error', async () => {
      const events$ = throwError(() => new Error('stream died'));
      const agentBuilder = createMockAgentBuilderStart(events$);

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.executeAgent('agent1', 'go');
      expect(result).toBe('');
    });

    it('returns empty string when no matching events', async () => {
      const events$ = EMPTY;
      const agentBuilder = createMockAgentBuilderStart(events$);

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.executeAgent('agent1', 'go');
      expect(result).toBe('');
    });
  });

  describe('runDiscoveryPipeline', () => {
    it('chains 3 agents and returns parsed skills', async () => {
      const skillsJson = JSON.stringify([
        { name: 'Test Skill', description: 'desc', markdown: '# Test', confidence: 0.9 },
      ]);

      const agentBuilder = {
        execution: {
          executeAgent: jest
            .fn()
            .mockResolvedValueOnce({
              executionId: 'e1',
              events$: of(messageComplete('{"schemas": []}')),
            })
            .mockResolvedValueOnce({
              executionId: 'e2',
              events$: of(messageComplete('[{"name": "pattern1"}]')),
            })
            .mockResolvedValueOnce({
              executionId: 'e3',
              events$: of(messageComplete(skillsJson)),
            }),
        },
      };

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.runDiscoveryPipeline({
        indexNames: ['logs-test'],
        analystRole: 'SOC Analyst',
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Skill');
      expect(agentBuilder.execution.executeAgent).toHaveBeenCalledTimes(3);
    });

    it('returns empty array when schema explorer fails', async () => {
      const agentBuilder = {
        execution: {
          executeAgent: jest.fn().mockResolvedValue({
            executionId: 'e1',
            events$: EMPTY,
          }),
        },
      };

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.runDiscoveryPipeline({
        indexNames: ['logs-test'],
        analystRole: 'SOC Analyst',
      });

      expect(result).toEqual([]);
      expect(agentBuilder.execution.executeAgent).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when pattern miner fails', async () => {
      // When pattern miner returns no content but schema explorer succeeded,
      // the pipeline still runs skill-generator with schema context.
      // Skill-generator returning empty events → empty skills list.
      const agentBuilder = {
        execution: {
          executeAgent: jest
            .fn()
            .mockResolvedValueOnce({
              executionId: 'e1',
              events$: of(messageComplete('schemas found')),
            })
            .mockResolvedValueOnce({
              // pattern miner fails (EMPTY observable → '' response)
              executionId: 'e2',
              events$: EMPTY,
            })
            .mockResolvedValueOnce({
              // skill-generator also returns empty → no skills
              executionId: 'e3',
              events$: EMPTY,
            }),
        },
      };

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.runDiscoveryPipeline({
        indexNames: ['logs-test'],
        analystRole: 'SOC Analyst',
      });

      expect(result).toEqual([]);
      expect(agentBuilder.execution.executeAgent).toHaveBeenCalledTimes(3);
    });
  });

  describe('validateSkill', () => {
    it('parses validation result from agent response', async () => {
      const validationJson = JSON.stringify({
        score: 0.92,
        passed: true,
        criteria: {
          relevance: 0.9,
          completeness: 0.95,
          accuracy: 0.9,
          specificity: 0.9,
          safety: 1.0,
        },
        feedback: 'Good skill',
        strengths: ['clear'],
        weaknesses: [],
        suggestions: [],
      });

      const agentBuilder = createMockAgentBuilderStart(of(messageComplete(validationJson)));

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.validateSkill('# Test Skill');
      expect(result.score).toBe(0.92);
      expect(result.passed).toBe(true);
    });

    it('returns null when agent returns empty', async () => {
      const agentBuilder = createMockAgentBuilderStart(EMPTY);

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.validateSkill('# Test');
      expect(result).toBeNull();
    });
  });

  describe('improveSkill', () => {
    it('parses improved skill from agent response', async () => {
      const improvedJson = JSON.stringify({
        name: 'Improved Skill',
        description: 'Better now',
        markdown: '# Improved\nBetter content',
      });

      const agentBuilder = createMockAgentBuilderStart(of(messageComplete(improvedJson)));

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.improveSkill('# Old Skill', 'Make it better');
      expect(result.name).toBe('Improved Skill');
    });

    it('handles markdown-wrapped JSON response', async () => {
      const agentBuilder = createMockAgentBuilderStart(
        of(
          messageComplete(
            '```json\n{"name": "Fixed", "description": "d", "markdown": "# Fixed"}\n```'
          )
        )
      );

      const orchestrator = new AgentOrchestrator({
        agentBuilderStart: agentBuilder,
        request: mockRequest,
        connectorId: 'c1',
        logger: mockLogger,
      });

      const result = await orchestrator.improveSkill('# Old', 'fix it');
      expect(result.name).toBe('Fixed');
    });
  });
});
