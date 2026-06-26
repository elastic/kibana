/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type {
  UsageApiSetup,
  UsageRecord,
  UsageReportingService,
} from '@kbn/usage-api-plugin/server';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { ModelProvider } from '@kbn/inference-common';
import type { AgentExecutionUsage } from './types';
import { createMeteringService } from './metering_service';

const createMockExecution = (): AgentExecutionUsage => ({
  agentId: 'agent-1',
  executionId: 'execution-1',
  conversationId: 'conversation-1',
  modelProvider: ModelProvider.OpenAI,
  roundCount: 1,
  round: {
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: { message: 'hello' },
    steps: [],
    response: { message: 'hi' },
    started_at: '2026-01-01T00:00:00.000Z',
    time_to_first_token: 100,
    time_to_last_token: 1000,
    model_usage: {
      connector_id: 'connector-1',
      llm_calls: 1,
      input_tokens: 100,
      output_tokens: 50,
      model: 'gpt-4o',
    },
  },
});

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
  } as Partial<Logger> as Logger);

const createMockUsageApi = () => {
  const reportUsage = jest.fn().mockResolvedValue(undefined);
  const usageApi = {
    usageReporting: {
      reportUsage,
    } as Partial<UsageReportingService> as UsageReportingService,
  } as UsageApiSetup;

  return { usageApi, reportUsage };
};

const createMockCloud = (overrides: Partial<CloudSetup> = {}): CloudSetup =>
  ({
    serverless: { projectId: 'project-1' },
    ...overrides,
  } as CloudSetup);

describe('Agent Builder MeteringService', () => {
  it('omits source metadata for serverless projects', async () => {
    const { usageApi, reportUsage } = createMockUsageApi();
    const service = createMeteringService({
      logger: createMockLogger(),
      cloud: createMockCloud(),
      usageApi,
    });

    await service.reportExecution(createMockExecution());

    const records: UsageRecord[] = reportUsage.mock.calls[0][0];
    expect(records[0].source.instance_group_type).toBe('serverless_project');
    expect(records[0].source.metadata).toBeUndefined();
  });

  it('includes the Kibana cluster ID for ECH deployments', async () => {
    const { usageApi, reportUsage } = createMockUsageApi();
    const service = createMeteringService({
      logger: createMockLogger(),
      cloud: createMockCloud({
        serverless: { projectId: undefined },
        deploymentId: 'deployment-1',
        csp: 'aws',
        region: 'us-east-1',
        kibanaClusterId: 'kibana-cluster-1',
      } as Partial<CloudSetup>),
      usageApi,
    });

    await service.reportExecution(createMockExecution());

    const records: UsageRecord[] = reportUsage.mock.calls[0][0];
    expect(records[0].source.instance_group_type).toBe('stateful_deployment');
    expect(records[0].source.metadata).toEqual({ cluster_id: 'kibana-cluster-1' });
  });
});
