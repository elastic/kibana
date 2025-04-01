/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { TelemetryTracer, TelemetryParams } from './telemetry_tracer';
import { Run } from 'langsmith/schemas';
import { loggerMock } from '@kbn/logging-mocks';

const mockRun = {
  inputs: {
    responseLanguage: 'English',
    conversationId: 'db8f74c5-7dca-43a3-b592-d56f219dffab',
    llmType: 'openai',
    isStream: false,
    isOssModel: false,
  },
  outputs: {
    input:
      'Generate an ESQL query to find documents with `host.name` that contains my favorite color',
    lastNode: 'agent',
    steps: [
      {
        action: {
          tool: 'KnowledgeBaseRetrievalTool',
          toolInput: {
            query: "user's favorite color",
          },
        },
        observation:
          '"[{\\"pageContent\\":\\"favorite color is blue\\",\\"metadata\\":{\\"source\\":\\"conversation\\",\\"required\\":false,\\"kbResource\\":\\"user\\"}},{\\"pageContent\\":\\"favorite food is pizza\\",\\"metadata\\":{\\"source\\":\\"conversation\\",\\"required\\":false,\\"kbResource\\":\\"user\\"}}]"',
      },
      {
        action: {
          tool: 'NaturalLanguageESQLTool',
          toolInput: {
            question: 'Generate an ESQL query to find documents with host.name that contains blue',
          },
        },
        observation:
          '"To find documents with `host.name` that contains \\"blue\\", you can use the `LIKE` operator with wildcards. Here is the ES|QL query:\\n\\n```esql\\nFROM your_index\\n| WHERE host.name LIKE \\"*blue*\\"\\n```\\n\\nReplace `your_index` with the actual name of your index. This query will filter documents where the `host.name` field contains the substring \\"blue\\"."',
      },
      {
        action: {
          tool: 'KnowledgeBaseRetrievalTool',
          toolInput: {
            query: "user's favorite food",
          },
        },
        observation:
          '"[{\\"pageContent\\":\\"favorite color is blue\\",\\"metadata\\":{\\"source\\":\\"conversation\\",\\"required\\":false,\\"kbResource\\":\\"user\\"}},{\\"pageContent\\":\\"favorite food is pizza\\",\\"metadata\\":{\\"source\\":\\"conversation\\",\\"required\\":false,\\"kbResource\\":\\"user\\"}}]"',
      },
      {
        action: {
          tool: 'CustomIndexTool',
          toolInput: {
            query: 'query about index',
          },
        },
        observation: '"Wow this is totally cool."',
      },
      {
        action: {
          tool: 'CustomIndexTool',
          toolInput: {
            query: 'query about index',
          },
        },
        observation: '"Wow this is totally cool."',
      },
      {
        action: {
          tool: 'CustomIndexTool',
          toolInput: {
            query: 'query about index',
          },
        },
        observation: '"Wow this is totally cool."',
      },
    ],
    hasRespondStep: false,
    agentOutcome: {
      returnValues: {
        output:
          'To find documents with `host.name` that contains your favorite color "blue", you can use the `LIKE` operator with wildcards. Here is the ES|QL query:\n\n```esql\nFROM your_index\n| WHERE host.name LIKE "*blue*"\n```\n\nReplace `your_index` with the actual name of your index. This query will filter documents where the `host.name` field contains the substring "blue".',
      },
      log: 'To find documents with `host.name` that contains your favorite color "blue", you can use the `LIKE` operator with wildcards. Here is the ES|QL query:\n\n```esql\nFROM your_index\n| WHERE host.name LIKE "*blue*"\n```\n\nReplace `your_index` with the actual name of your index. This query will filter documents where the `host.name` field contains the substring "blue".',
    },
    messages: [],
    chatTitle: 'Welcome',
    llmType: 'openai',
    isStream: false,
    isOssModel: false,
    conversation: {
      timestamp: '2024-11-07T17:37:07.400Z',
      createdAt: '2024-11-07T17:37:07.400Z',
      users: [
        {
          id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          name: 'elastic',
        },
      ],
      title: 'Welcome',
      category: 'assistant',
      apiConfig: {
        connectorId: 'my-gpt4o-ai',
        actionTypeId: '.gen-ai',
      },
      isDefault: true,
      messages: [
        {
          timestamp: '2024-11-07T22:47:45.994Z',
          content:
            'Generate an ESQL query to find documents with `host.name` that contains my favorite color',
          role: 'user',
        },
      ],
      updatedAt: '2024-11-08T17:01:21.958Z',
      replacements: {},
      namespace: 'default',
      id: 'db8f74c5-7dca-43a3-b592-d56f219dffab',
    },
    conversationId: 'db8f74c5-7dca-43a3-b592-d56f219dffab',
    responseLanguage: 'English',
  },
  end_time: 1731085297190,
  start_time: 1731085289113,
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
        totalTools: 9,
      },
      logger
    );
  });

  it('should initialize correctly', () => {
    expect(telemetryTracer.name).toBe('telemetry_tracer');
    expect(telemetryTracer.elasticTools).toEqual(elasticTools);
    expect(telemetryTracer.telemetry).toBe(telemetry);
    expect(telemetryTracer.telemetryParams).toBe(telemetryParams);
    expect(telemetryTracer.totalTools).toBe(9);
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
        NaturalLanguageESQLTool: 1,
        CustomTool: 3,
      },
    });
  });
});
