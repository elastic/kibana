/**
 * @jest-environment node
 */

/* eslint-disable @kbn/eslint/require-license-header, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { join } from 'path';
import type { AgentBuilderContribution } from '@kbn/agent-builder-server';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { kibanaPackageJson, REPO_ROOT } from '@kbn/repo-info';
import { startWorkflowProcessHarness } from '@kbn/workflows-execution-engine/server/integration_tests/workflow_process_harness';
import type { WorkflowProcessHarnessOptions } from '@kbn/workflows-execution-engine/server/integration_tests/workflow_process_harness';
import { configSchema as agentBuilderConfigSchema } from '../../config';
import { collectRegisteredIds } from '../../run_services/collect_registered_ids';
import {
  AGENT_BUILDER_RUN_SETTINGS_ID,
  getAgentBuilderRunSettings,
} from '../../run_services/run_settings';
import { agentBuilderSpaceSettingsType } from '../../saved_objects';
import { getExampleContributionSettings } from '../example_contribution_settings';
import { createAgentExecutionClient } from '../../services/execution/persistence/agent_execution_client';
import { taskTypes } from '../../services/execution/task/task_definitions';
import { taskType as runAgentTaskType } from '../run_agent.task';

const { getContributionFiles } = require(join(REPO_ROOT, 'src/dev/task_bundles/build'));

const CONNECTOR_ID = 'llm-connector';
const AGENT_ID = 'elastic-ai-agent';
const FINAL_ANSWER = 'Hello from the task process.';
const RUN_AGENT_TASK_FILE = join(
  REPO_ROOT,
  'x-pack/platform/plugins/shared/agent_builder/server/task_types/run_agent.task.ts'
);
const RUN_AGENT_BUNDLE_NAME = 'agentBuilder__run_agent';

/**
 * Starts the stub LLM every test in this file talks to; the model always answers the same way,
 * streaming its response the way the real connector asks for (`request.stream`).
 */
const startLlmStub = async (): Promise<{
  server: Server;
  url: string;
  requestCount: () => number;
}> => {
  let requestCount = 0;
  const base = { id: 'chatcmpl-1', created: 1, model: 'gpt-4' };
  const delta = { role: 'assistant', content: FINAL_ANSWER };
  const usage = { prompt_tokens: 7, completion_tokens: 5, total_tokens: 12 };
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requestCount += 1;
      const request = JSON.parse(body || '{}') as { stream?: boolean };
      if (request.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write(
          `data: ${JSON.stringify({
            ...base,
            object: 'chat.completion.chunk',
            choices: [{ index: 0, delta, finish_reason: null }],
          })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({
            ...base,
            object: 'chat.completion.chunk',
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
            usage,
          })}\n\n`
        );
        res.end('data: [DONE]\n\n');
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            ...base,
            object: 'chat.completion',
            choices: [{ index: 0, message: delta, finish_reason: 'stop' }],
            usage,
          })
        );
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    server,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requestCount: () => requestCount,
  };
};

/** The settings and parity Kibana would send with every agent builder contribution enabled. */
const collectKibanaRegistrations = async () => {
  const contributions: AgentBuilderContribution[] = getContributionFiles('agent-builder').map(
    (file: string) => require(file).contribution
  );
  const settings = {
    ...getExampleContributionSettings(contributions),
    [AGENT_BUILDER_RUN_SETTINGS_ID]: getAgentBuilderRunSettings({
      config: agentBuilderConfigSchema.validate({}, { dev: false }),
      env: {
        packageInfo: { version: kibanaPackageJson.version, buildFlavor: 'traditional' },
        airgapped: false,
      } as never,
      getSearchInferenceEndpoints: () => undefined,
    }),
  };
  const registered = await collectRegisteredIds({
    contributions,
    settings,
    logger: loggingSystemMock.createLogger(),
  });
  return { contributions, settings, registered };
};

const seedConnector =
  (llmUrl: string) =>
  async ({ host }: Parameters<NonNullable<WorkflowProcessHarnessOptions['seed']>>[0]) => {
    // The connector Kibana would have saved: an LLM connector (the client encrypts its secrets).
    await host.savedObjects.getUnsafeInternalClient({ includedHiddenTypes: ['action'] }).create(
      'action',
      {
        name: 'stub llm',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `${llmUrl}/v1/chat/completions`,
          defaultModel: 'gpt-4',
        },
        secrets: { apiKey: 'test-key' },
      },
      { id: CONNECTOR_ID }
    );
  };

const taskFor = (executionId: string) => ({
  id: `${taskTypes.runAgent}:${executionId}`,
  params: { executionId },
});

/**
 * `agent-builder:run-agent` from its own bundle, forked by the supervisor the way Kibana does,
 * against a real Elasticsearch: the process reads the execution document, runs the agent with the
 * same `createTaskHandler` Kibana itself runs with, and the result lands on that document — the run
 * is not declined, so the process's agent builder registries matched what Kibana sent as parity.
 */
describe('the agent-builder:run-agent task type served from its own bundle', () => {
  let harness: Awaited<ReturnType<typeof startWorkflowProcessHarness>>;
  let llm: Awaited<ReturnType<typeof startLlmStub>>;

  const createExecution = (executionId: string, parentExecutionId?: string) =>
    createAgentExecutionClient({
      logger: loggingSystemMock.createLogger(),
      esClient: harness.es as never,
    }).create({
      executionId,
      agentId: AGENT_ID,
      spaceId: 'default',
      executionMode: AgentExecutionMode.standalone,
      agentParams: { connectorId: CONNECTOR_ID, nextInput: { message: 'Say hello and stop.' } },
      ...(parentExecutionId ? { parentExecutionId } : {}),
    });

  const getExecution = (executionId: string) =>
    createAgentExecutionClient({
      logger: loggingSystemMock.createLogger(),
      esClient: harness.es as never,
    }).get(executionId);

  /** Polls the execution document until the process has claimed the run and set it to `running`. */
  const waitUntilRunning = async (executionId: string, timeoutMs = 10_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const execution = await getExecution(executionId);
      if (execution?.status === ExecutionStatus.running) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Execution ${executionId} never reached status 'running'`);
  };

  beforeAll(async () => {
    llm = await startLlmStub();
    const { contributions, settings, registered } = await collectKibanaRegistrations();

    harness = await startWorkflowProcessHarness({
      workflows: {},
      executionTask: {
        taskType: runAgentTaskType,
        file: RUN_AGENT_TASK_FILE,
        name: RUN_AGENT_BUNDLE_NAME,
      },
      settings,
      seedContributions: {
        'agent-builder': contributions,
        embeddables: getContributionFiles('embeddables').map(
          (file: string) => require(file).contribution
        ),
        'lens-visualization-migrations': getContributionFiles('lens-visualization-migrations').map(
          (file: string) => require(file).contribution
        ),
      },
      // What Kibana registered matches what the process registers with the same contributions, so a
      // run is not declined for a registration gap.
      parity: Object.entries(registered).map(([kind, ids]) => ({
        kind: `agentBuilder.${kind}`,
        ids,
      })),
      savedObjectTypes: [agentBuilderSpaceSettingsType],
      seed: seedConnector(llm.url),
    });
  });

  afterAll(async () => {
    await harness?.stop();
    await new Promise((resolve) => llm?.server.close(resolve));
  });

  it('runs a real execution with the task handler of the process', async () => {
    const executionId = 'run-agent-real-run';
    await createExecution(executionId);
    const onDispatchFailure = jest.fn();

    await harness.runTask(taskTypes.runAgent, taskFor(executionId), onDispatchFailure);

    expect(onDispatchFailure).not.toHaveBeenCalled();
    const execution = await getExecution(executionId);
    expect(execution).toEqual(expect.objectContaining({ status: ExecutionStatus.completed }));
    expect(JSON.stringify(execution?.events)).toContain(FINAL_ANSWER);
    expect(llm.requestCount()).toBeGreaterThan(0);
  });

  it('cancels a run in progress, which records the execution as aborted', async () => {
    const executionId = 'run-agent-cancelled';
    await createExecution(executionId);

    const { runner, promise } = harness.runTaskHandle(
      taskTypes.runAgent,
      taskFor(executionId),
      jest.fn()
    );
    // Wait for the process to claim the run and start the handler before cancelling it.
    await waitUntilRunning(executionId);
    await runner.cancel();
    await promise.catch(() => undefined);

    const execution = await getExecution(executionId);
    expect(execution?.status).toBe(ExecutionStatus.aborted);
  });

  it('serves a background sub-agent execution concurrently with its parent, in the same process', async () => {
    const parentId = 'run-agent-parent';
    const childId = 'run-agent-child';
    await createExecution(parentId);
    await createExecution(childId, parentId);

    await Promise.all([
      harness.runTask(taskTypes.runAgent, taskFor(parentId), jest.fn()),
      harness.runTask(taskTypes.runAgent, taskFor(childId), jest.fn()),
    ]);

    const [parent, child] = await Promise.all([getExecution(parentId), getExecution(childId)]);
    expect(parent?.status).toBe(ExecutionStatus.completed);
    expect(child?.status).toBe(ExecutionStatus.completed);
    expect(child?.parentExecutionId).toBe(parentId);
  });
});

/**
 * A process whose own agent builder registrations are missing something Kibana sent as parity: the
 * run is declined (`DeclinedRunError`) rather than served with a registration gap, which would make
 * the agent behave differently than it would in Kibana.
 */
describe('the agent-builder:run-agent task type with a parity gap', () => {
  let harness: Awaited<ReturnType<typeof startWorkflowProcessHarness>>;
  let llm: Awaited<ReturnType<typeof startLlmStub>>;

  beforeAll(async () => {
    llm = await startLlmStub();
    const { contributions, settings, registered } = await collectKibanaRegistrations();
    const parity = Object.entries(registered).map(([kind, ids]) => ({
      kind: `agentBuilder.${kind}`,
      // A tool id Kibana says it registered that nothing in this process contributes.
      ids: kind === 'tools' ? [...ids, 'a-tool-only-kibana-has'] : ids,
    }));

    harness = await startWorkflowProcessHarness({
      workflows: {},
      executionTask: {
        taskType: runAgentTaskType,
        file: RUN_AGENT_TASK_FILE,
        name: RUN_AGENT_BUNDLE_NAME,
      },
      settings,
      seedContributions: {
        'agent-builder': contributions,
        embeddables: getContributionFiles('embeddables').map(
          (file: string) => require(file).contribution
        ),
        'lens-visualization-migrations': getContributionFiles('lens-visualization-migrations').map(
          (file: string) => require(file).contribution
        ),
      },
      parity,
      savedObjectTypes: [agentBuilderSpaceSettingsType],
      seed: seedConnector(llm.url),
    });
  });

  afterAll(async () => {
    await harness?.stop();
    await new Promise((resolve) => llm?.server.close(resolve));
  });

  it('declines the run instead of serving it with the gap', async () => {
    const executionId = 'run-agent-parity-gap';
    await createAgentExecutionClient({
      logger: loggingSystemMock.createLogger(),
      esClient: harness.es as never,
    }).create({
      executionId,
      agentId: AGENT_ID,
      spaceId: 'default',
      executionMode: AgentExecutionMode.standalone,
      agentParams: { connectorId: CONNECTOR_ID, nextInput: { message: 'Say hello and stop.' } },
    });
    const onDispatchFailure = jest.fn();

    await expect(
      harness.runTask(taskTypes.runAgent, taskFor(executionId), onDispatchFailure)
    ).rejects.toThrow();

    expect(onDispatchFailure).toHaveBeenCalledWith(
      taskTypes.runAgent,
      'declined',
      expect.stringContaining('agent builder')
    );
  });
});
