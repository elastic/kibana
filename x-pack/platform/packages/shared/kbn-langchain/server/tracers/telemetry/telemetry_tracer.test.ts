/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { TelemetryParams } from './telemetry_tracer';
import { TelemetryTracer } from './telemetry_tracer';
import type { Run } from 'langsmith/schemas';
import { loggerMock } from '@kbn/logging-mocks';
import { AIMessageChunk, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const mockRun = {
  inputs: {
    responseLanguage: 'English',
    conversationId: 'db8f74c5-7dca-43a3-b592-d56f219dffab',
    llmType: 'openai',
    isStream: false,
    isOssModel: false,
  },
  outputs: {
    lastNode: 'agent',
    messages: [
      new SystemMessage(
        `You are a security analyst and expert in resolving security incidents. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security. If available, use the Knowledge History provided to try and answer the question. If not provided, you can try and query for additional knowledge via the KnowledgeBaseRetrievalTool. \n\nAnnotate your answer with the provided citations. Here are some example responses with citations: \n1. \"Machine learning is increasingly used in cyber threat detection. {reference(prSit)}\" \n2. \"The alert has a risk score of 72. {reference(OdRs2)}\"\n\nOnly use the citations returned by tools\n\n \nCurrent time: Wed, Jul 30, 2025 11:23 AM UTC+01:00 (10:23 AM UTC).`
      ),
      new HumanMessage(`How many alerts do I have open?`),
      new AIMessageChunk({
        content: 'I can help with that. Let me check the latest alerts in your environment.',
        tool_calls: [
          {
            name: 'AlertCountsTool',
            args: {
              input: 'Count of open alerts in the environment',
            },
            id: 'call_wE5mZjGNbRFcdLbp8xfjz6N0',
            type: 'tool_call',
          },
          {
            name: 'OpenAndAcknowledgedAlertsTool',
            args: {
              input: 'Open alerts',
            },
            id: 'call_wE5mZjGNb232121',
            type: 'tool_call',
          },
        ],
      }),
      new ToolMessage({
        tool_call_id: 'call_wE5mZjGNbRFcdLbp8xfjz6N0',
        content: `{"open_alerts": 5, "acknowledged_alerts": 2}`,
      }),
      new ToolMessage({
        tool_call_id: 'call_wE5mZjGNb232121',
        content: `{"open_alerts": 5, "acknowledged_alerts": 2}`,
      }),
      new AIMessageChunk({
        content: 'I found 5 open alerts and 2 acknowledged alerts in the environment.',
      }),
      new HumanMessage(`What is my favorite food?`),
      new AIMessageChunk({
        content: 'I can help with that. Let me check the latest knowledge base articles.',
        tool_calls: [
          {
            name: 'KnowledgeBaseRetrievalTool',
            args: {
              input: 'What is my favorite food?',
            },
            id: 'call_1234567890abcdef',
            type: 'tool_call',
          },
          {
            name: 'KnowledgeBaseRetrievalTool',
            args: {
              input: 'food?',
            },
            id: 'call_1234321abcdef',
            type: 'tool_call',
          },
        ],
      }),
      new ToolMessage({
        tool_call_id: 'call_1234567890abcdef',
        content: `{"favorite_food": "Pizza"}`,
      }),
      new ToolMessage({
        tool_call_id: 'call_1234321abcdef',
        content: `{"favorite_food": "Pizza"}`,
      }),
      new AIMessageChunk({
        content: 'I found your favorite food: Pizza.',
      }),
      new HumanMessage(`What is my oncall schedule?`),
      new AIMessageChunk({
        content: 'I can help with that. Let me check the latest knowledge base articles.',
        tool_calls: [
          {
            name: 'OnCallScheduleTool',
            args: {
              input: 'What is my oncall schedule?',
            },
            id: 'call_abcdef1234567890',
            type: 'tool_call',
          },
          {
            name: 'CalendarTool',
            args: {
              input: 'What is my oncall schedule?',
            },
            id: 'call_abcdef1234567890',
            type: 'tool_call',
          },
        ],
      }),
      new ToolMessage({
        tool_call_id: 'call_abcdef1234567890',
        content: `{"oncall_schedule": "You are on call from 9 AM to 5 PM, Monday to Friday."}`,
      }),
      new AIMessageChunk({
        content:
          'I found your oncall schedule: You are on call from 9 AM to 5 PM, Monday to Friday.',
      }),
    ],
    hasRespondStep: false,
    llmType: 'openai',
    isStream: false,
    isOssModel: false,
    conversationId: 'db8f74c5-7dca-43a3-b592-d56f219dffab',
    responseLanguage: 'English',
  },
  end_time: 1731085297190,
  start_time: 1731085289113,
} as unknown as Run;

const mockRunWithError = {
  id: '2f27baaf-b7ee-4bb6-be31-a1d2c2d39fe6',
  name: 'AlertCountsTool',
  parent_run_id: 'c2e5f665-609c-4f3b-8306-e0633f6c67eb',
  start_time: 1753872746020,
  serialized: {
    lc: 1,
    type: 'not_implemented',
    id: ['langchain', 'tools', 'DynamicTool'],
  },
  events: [
    { name: 'start', time: '2025-07-30T10:52:26.020Z' },
    { name: 'error', time: '2025-07-30T10:52:26.121Z' },
  ],
  inputs: { input: '{"input":"open alerts in the last 24 hours"}' },
  execution_order: 10,
  child_execution_order: 10,
  run_type: 'tool',
  child_runs: [],
  extra: {
    metadata: {
      langgraph_step: 2,
      langgraph_node: 'tools',
      langgraph_triggers: [Array],
      langgraph_path: [Array],
      langgraph_checkpoint_ns: 'tools:a379987b-cd09-575f-95d1-2a5cb578b8fa',
      __pregel_task_id: 'a379987b-cd09-575f-95d1-2a5cb578b8fa',
      checkpoint_ns: 'tools:a379987b-cd09-575f-95d1-2a5cb578b8fa',
    },
  },
  tags: ['alerts', 'alerts-count'],
  trace_id: '9acf3dce-1846-400b-bb24-963908db523d',
  dotted_order:
    '20250730T105223978001Z9acf3dce-1846-400b-bb24-963908db523d.20250730T105225946009Zc2e5f665-609c-4f3b-8306-e0633f6c67eb.20250730T105226020010Z2f27baaf-b7ee-4bb6-be31-a1d2c2d39fe6',
  end_time: 1753872746121,
  error: 'AlertCountsTool should not be called directly, use the assistant tool instead',
} as unknown as Run;

const elasticTools = [
  'AlertCountsTool',
  'NaturalLanguageESQLTool',
  'KnowledgeBaseRetrievalTool',
  'KnowledgeBaseWriteTool',
  'OpenAndAcknowledgedAlertsTool',
  'SecurityLabsKnowledgeBaseTool',
];
const mockLogger = loggerMock.create();

describe('TelemetryTracer', () => {
  let telemetry: AnalyticsServiceSetup;
  let logger: Logger;
  let telemetryParams: TelemetryParams;
  let telemetryTracer: TelemetryTracer;
  const reportEvent = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    telemetry = {
      reportEvent,
    } as unknown as AnalyticsServiceSetup;
    logger = mockLogger;
    telemetryParams = {
      eventType: 'INVOKE_AI_SUCCESS',
      assistantStreamingEnabled: true,
      actionTypeId: '.gen-ai',
      isEnabledKnowledgeBase: true,
      model: 'test_model',
    };
    telemetryTracer = new TelemetryTracer(
      {
        elasticTools,
        telemetry,
        telemetryParams,
      },
      logger
    );
  });

  it('should initialize correctly', () => {
    expect(telemetryTracer.name).toBe('telemetry_tracer');
    expect(telemetryTracer.elasticTools).toEqual(elasticTools);
    expect(telemetryTracer.telemetry).toBe(telemetry);
    expect(telemetryTracer.telemetryParams).toBe(telemetryParams);
  });

  it('should not log and report event on chain end if parent_run_id exists', async () => {
    await telemetryTracer.onChainEnd({ ...mockRun, parent_run_id: '123' });

    expect(logger.get().debug).not.toHaveBeenCalled();
    expect(telemetry.reportEvent).not.toHaveBeenCalled();
  });

  it('should log and report event on chain end', async () => {
    await telemetryTracer.onChainEnd(mockRun);

    expect(logger.get().debug).toHaveBeenCalledWith(expect.any(Function));
    expect(telemetry.reportEvent).toHaveBeenCalledWith('INVOKE_AI_SUCCESS', {
      assistantStreamingEnabled: true,
      actionTypeId: '.gen-ai',
      isEnabledKnowledgeBase: true,
      model: 'test_model',
      isOssModel: false,
      durationMs: 8077,
      toolsInvoked: {
        KnowledgeBaseRetrievalTool: 2,
        AlertCountsTool: 1,
        OpenAndAcknowledgedAlertsTool: 1,
        CustomTool: 2,
      },
    });
  });

  it('should log and report event on chain error', async () => {
    await telemetryTracer.onToolError(mockRunWithError);

    expect(logger.get().debug).toHaveBeenCalledWith(expect.any(Function));
    expect(telemetry.reportEvent).toHaveBeenCalledWith('invoke_assistant_error', {
      assistantStreamingEnabled: true,
      actionTypeId: '.gen-ai',
      isEnabledKnowledgeBase: true,
      model: 'test_model',
      errorLocation: 'executeTools-AlertCountsTool',
      errorMessage: 'AlertCountsTool should not be called directly, use the assistant tool instead',
    });
  });
});
