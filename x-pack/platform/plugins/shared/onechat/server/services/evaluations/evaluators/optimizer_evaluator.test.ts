/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Conversation, ConversationRound } from '@kbn/onechat-common';
import { ConversationRoundStepType, ToolType } from '@kbn/onechat-common';
import type { AgentsServiceStart } from '../../agents';
import type { ToolsServiceStart } from '../../tools';
import { createOptimizerEvaluator } from './optimizer_evaluator';

describe('OptimizerEvaluator', () => {
  let logger: MockedLogger;
  let mockInferenceClient: jest.Mocked<BoundInferenceClient>;
  let mockAgentsService: jest.Mocked<AgentsServiceStart>;
  let mockToolsService: jest.Mocked<ToolsServiceStart>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;

  const createMockConversation = (
    rounds: ConversationRound[],
    agentId: string = 'test-agent'
  ): Conversation => ({
    id: 'conv-123',
    agent_id: agentId,
    user: { id: 'user-1', username: 'testuser' },
    title: 'Test Conversation',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    rounds,
  });

  const createMockRound = (
    id: string,
    input: string,
    response: string,
    steps: any[] = []
  ): ConversationRound => ({
    id,
    input: { message: input },
    response: { message: response },
    steps,
  });

  beforeEach(() => {
    logger = loggerMock.create();
    mockRequest = httpServerMock.createKibanaRequest();

    mockInferenceClient = {
      prompt: jest.fn(),
    } as any;

    const mockAgentRegistry = {
      get: jest.fn().mockResolvedValue({
        id: 'test-agent',
        name: 'Test Agent',
        configuration: {
          instructions: 'You are a helpful assistant.',
          tools: [{ tool_ids: ['tool1', 'tool2'] }],
        },
      }),
    };

    mockAgentsService = {
      getRegistry: jest.fn().mockResolvedValue(mockAgentRegistry),
    } as any;

    const mockToolRegistry = {
      list: jest.fn().mockResolvedValue([
        {
          id: 'tool1',
          type: ToolType.builtin,
          description: 'A useful search tool',
        },
        {
          id: 'tool2',
          type: ToolType.builtin,
          description: 'A data retrieval tool',
        },
      ]),
    };

    mockToolsService = {
      getRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
    } as any;
  });

  it('successfully evaluates agent with good prompt and tool usage', async () => {
    const mockAnalysis = {
      system_prompt_analysis: {
        strengths: ['Clear role definition', 'Concise instructions'],
        weaknesses: ['Could be more specific'],
        recommendations: ['Add more context about domain'],
      },
      tool_usage_analysis: {
        tool_selection_quality: 'Good tool selection for the query',
        usage_effectiveness: 'Tools were used effectively',
        missed_opportunities: [],
      },
      overall_feedback: 'Well-configured agent with minor improvements possible',
      satisfaction_score: 8.5,
    };

    mockInferenceClient.prompt.mockResolvedValue({
      toolCalls: [
        {
          function: {
            arguments: mockAnalysis,
          },
        },
      ],
    } as any);

    const evaluator = createOptimizerEvaluator({
      inferenceClient: mockInferenceClient,
      logger,
      agentsService: mockAgentsService,
      toolsService: mockToolsService,
      request: mockRequest,
    });

    const conversation = createMockConversation([
      createMockRound('round-1', 'What is the weather?', 'The weather is sunny.', [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call1',
          tool_id: 'tool1',
          params: { query: 'weather' },
          results: [{ type: 'text', data: { text: 'sunny' } }],
        },
      ]),
    ]);

    const result = await evaluator({
      conversation,
      currentRound: conversation.rounds[0],
      customInstructions: '',
    });

    expect(result.score).toBe(0.85);
    expect(result.analysis).toEqual(mockAnalysis);
    expect(mockInferenceClient.prompt).toHaveBeenCalledWith({
      prompt: expect.any(Object),
      input: expect.objectContaining({
        user_query: 'What is the weather?',
        agent_response: 'The weather is sunny.',
        system_instructions: 'You are a helpful assistant.',
      }),
    });
  });

  it('identifies issues with vague system prompts', async () => {
    const mockAnalysis = {
      system_prompt_analysis: {
        strengths: [],
        weaknesses: ['Too vague', 'No specific guidance', 'Missing constraints'],
        recommendations: [
          'Define specific role and expertise',
          'Add operational guidelines',
          'Include example scenarios',
        ],
      },
      tool_usage_analysis: {
        tool_selection_quality: 'Adequate',
        usage_effectiveness: 'Could be better',
        missed_opportunities: ['Could have used tool2 for more detailed results'],
      },
      overall_feedback: 'Agent needs clearer system instructions',
      satisfaction_score: 4.0,
    };

    mockInferenceClient.prompt.mockResolvedValue({
      toolCalls: [
        {
          function: {
            arguments: mockAnalysis,
          },
        },
      ],
    } as any);

    const mockAgentRegistry = {
      get: jest.fn().mockResolvedValue({
        id: 'vague-agent',
        name: 'Vague Agent',
        configuration: {
          instructions: 'Be helpful.',
          tools: [{ tool_ids: ['tool1'] }],
        },
      }),
    };

    mockAgentsService.getRegistry = jest.fn().mockResolvedValue(mockAgentRegistry);

    const evaluator = createOptimizerEvaluator({
      inferenceClient: mockInferenceClient,
      logger,
      agentsService: mockAgentsService,
      toolsService: mockToolsService,
      request: mockRequest,
    });

    const conversation = createMockConversation(
      [createMockRound('round-1', 'Help me', 'I will help you.')],
      'vague-agent'
    );

    const result = await evaluator({
      conversation,
      currentRound: conversation.rounds[0],
      customInstructions: '',
    });

    expect(result.score).toBe(0.4);
    expect(result.analysis.system_prompt_analysis.weaknesses).toHaveLength(3);
  });

  it('detects suboptimal tool selection', async () => {
    const mockAnalysis = {
      system_prompt_analysis: {
        strengths: ['Good structure'],
        weaknesses: [],
        recommendations: ['Consider more specific examples'],
      },
      tool_usage_analysis: {
        tool_selection_quality: 'Poor - wrong tool selected',
        usage_effectiveness: 'Tool was not effective for this query',
        missed_opportunities: [
          'tool2 would have been more appropriate',
          'No tools called when they should have been',
        ],
      },
      overall_feedback: 'Agent needs better tool selection strategy',
      satisfaction_score: 3.5,
    };

    mockInferenceClient.prompt.mockResolvedValue({
      toolCalls: [
        {
          function: {
            arguments: mockAnalysis,
          },
        },
      ],
    } as any);

    const evaluator = createOptimizerEvaluator({
      inferenceClient: mockInferenceClient,
      logger,
      agentsService: mockAgentsService,
      toolsService: mockToolsService,
      request: mockRequest,
    });

    const conversation = createMockConversation([
      createMockRound('round-1', 'Get document by ID', 'Here is some general information.'),
    ]);

    const result = await evaluator({
      conversation,
      currentRound: conversation.rounds[0],
      customInstructions: '',
    });

    expect(result.score).toBe(0.35);
    expect(result.analysis.tool_usage_analysis.missed_opportunities).toHaveLength(2);
  });

  it('handles missing agent configuration gracefully', async () => {
    const mockAgentRegistry = {
      get: jest.fn().mockRejectedValue(new Error('Agent not found')),
    };

    mockAgentsService.getRegistry = jest.fn().mockResolvedValue(mockAgentRegistry);

    const evaluator = createOptimizerEvaluator({
      inferenceClient: mockInferenceClient,
      logger,
      agentsService: mockAgentsService,
      toolsService: mockToolsService,
      request: mockRequest,
    });

    const conversation = createMockConversation([
      createMockRound('round-1', 'Test query', 'Test response'),
    ]);

    await expect(
      evaluator({
        conversation,
        currentRound: conversation.rounds[0],
        customInstructions: '',
      })
    ).rejects.toThrow('Agent not found');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in optimizer evaluation')
    );
  });

  it('handles errors from inference client', async () => {
    mockInferenceClient.prompt.mockRejectedValue(new Error('Inference error'));

    const evaluator = createOptimizerEvaluator({
      inferenceClient: mockInferenceClient,
      logger,
      agentsService: mockAgentsService,
      toolsService: mockToolsService,
      request: mockRequest,
    });

    const conversation = createMockConversation([
      createMockRound('round-1', 'Test query', 'Test response'),
    ]);

    await expect(
      evaluator({
        conversation,
        currentRound: conversation.rounds[0],
        customInstructions: '',
      })
    ).rejects.toThrow('Inference error');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in optimizer evaluation')
    );
  });

  it('returns proper score range (0-1)', async () => {
    const testScores = [0, 2.5, 5.0, 7.5, 10];

    for (const rawScore of testScores) {
      const mockAnalysis = {
        system_prompt_analysis: {
          strengths: [],
          weaknesses: [],
          recommendations: [],
        },
        tool_usage_analysis: {
          tool_selection_quality: 'test',
          usage_effectiveness: 'test',
          missed_opportunities: [],
        },
        overall_feedback: 'test',
        satisfaction_score: rawScore,
      };

      mockInferenceClient.prompt.mockResolvedValue({
        toolCalls: [
          {
            function: {
              arguments: mockAnalysis,
            },
          },
        ],
      } as any);

      const evaluator = createOptimizerEvaluator({
        inferenceClient: mockInferenceClient,
        logger,
        agentsService: mockAgentsService,
        toolsService: mockToolsService,
        request: mockRequest,
      });

      const conversation = createMockConversation([
        createMockRound('round-1', 'Test', 'Test response'),
      ]);

      const result = await evaluator({
        conversation,
        currentRound: conversation.rounds[0],
        customInstructions: '',
      });

      expect(result.score).toBe(rawScore / 10);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });

  it('handles missing tool call in response', async () => {
    mockInferenceClient.prompt.mockResolvedValue({
      toolCalls: [],
    } as any);

    const evaluator = createOptimizerEvaluator({
      inferenceClient: mockInferenceClient,
      logger,
      agentsService: mockAgentsService,
      toolsService: mockToolsService,
      request: mockRequest,
    });

    const conversation = createMockConversation([
      createMockRound('round-1', 'Test query', 'Test response'),
    ]);

    await expect(
      evaluator({
        conversation,
        currentRound: conversation.rounds[0],
        customInstructions: '',
      })
    ).rejects.toThrow('No tool call found in LLM response for optimizer evaluation');
  });

  it('handles agent without system instructions', async () => {
    const mockAnalysis = {
      system_prompt_analysis: {
        strengths: [],
        weaknesses: ['No system instructions provided'],
        recommendations: ['Add system instructions to define agent behavior'],
      },
      tool_usage_analysis: {
        tool_selection_quality: 'Cannot assess without instructions',
        usage_effectiveness: 'Cannot assess without instructions',
        missed_opportunities: [],
      },
      overall_feedback: 'Critical: Agent missing system instructions',
      satisfaction_score: 2.0,
    };

    mockInferenceClient.prompt.mockResolvedValue({
      toolCalls: [
        {
          function: {
            arguments: mockAnalysis,
          },
        },
      ],
    } as any);

    const mockAgentRegistry = {
      get: jest.fn().mockResolvedValue({
        id: 'no-instructions-agent',
        name: 'No Instructions Agent',
        configuration: {
          tools: [{ tool_ids: ['tool1'] }],
        },
      }),
    };

    mockAgentsService.getRegistry = jest.fn().mockResolvedValue(mockAgentRegistry);

    const evaluator = createOptimizerEvaluator({
      inferenceClient: mockInferenceClient,
      logger,
      agentsService: mockAgentsService,
      toolsService: mockToolsService,
      request: mockRequest,
    });

    const conversation = createMockConversation(
      [createMockRound('round-1', 'Test', 'Response')],
      'no-instructions-agent'
    );

    const result = await evaluator({
      conversation,
      currentRound: conversation.rounds[0],
      customInstructions: '',
    });

    expect(result.score).toBe(0.2);
    expect(mockInferenceClient.prompt).toHaveBeenCalledWith({
      prompt: expect.any(Object),
      input: expect.objectContaining({
        system_instructions: '',
      }),
    });
  });
});
