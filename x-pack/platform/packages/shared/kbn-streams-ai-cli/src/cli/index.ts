/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe, type InferenceCliClient } from '@kbn/inference-cli';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceChatModel } from '@kbn/inference-langchain';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaClient } from '@kbn/kibana-api-cli';

import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import { partitionStreamWorkflow } from '@kbn/streams-ai/src/workflows/partition_stream/partition_stream_workflow';
import { onboardStreamWorkflow } from '@kbn/streams-ai/src/workflows/onboarding/onboard_stream_workflow';
import {
  onboardAnomalyDetectionJobsWorkflow,
  onboardDashboardsWorkflow,
  generateNaturalLanguageQueriesWorkflow,
  onboardProcessingWorkflow,
  onboardRulesWorkflow,
  onboardSLOsWorkflow,
} from '@kbn/streams-ai/src/workflows/onboarding/onboarding_workflows';
import { ConnectorsService } from './services/connectors_service';
import { StreamsService } from './services/streams_service';
import { promptMainMenu } from './menus/main_menu';
import { selectConnector } from './menus/select_connector';
import { selectStream } from './menus/select_stream';
import { promptTimeRangeSelection } from './menus/select_time_range';
import { selectAction } from './menus/select_action';
import { renderStatusLine } from './ui/status_line';
import { STREAM_ACTION_ITEMS } from './actions';
import type {
  MenuState,
  StreamMenuItem,
  StreamWorkflowMenuItem,
  StreamActionResult,
  StreamAction,
} from './types';
import { DEFAULT_TIME_RANGE, computeTimeRangeBounds, getTimeRangeById } from './time_range';
import { formatStreamLabel } from './stream_labels';
import { promptInput, BACK_OPTION_VALUE } from './prompt/prompt';

export async function run() {
  // Main entry point – initialize services and drive the top-level menu loop.
  return runRecipe(
    { name: 'streams_ai_cli', flags: {}, disableRootSpan: true },
    async ({ inferenceClient, kibanaClient, esClient, logger, signal }) => {
      const connectorsService = new ConnectorsService(kibanaClient);
      const streamsService = new StreamsService(kibanaClient);

      // Shared mutable menu state.
      const state: MenuState = { timeRangeId: DEFAULT_TIME_RANGE.id };

      // Attempt to resolve the currently bound connector so status line has initial context.
      const initialConnector = await resolveInitialConnector({ client: inferenceClient, logger });
      if (initialConnector) {
        state.connector = initialConnector;
      }

      // Active inference client may be rebound when user selects another connector.
      let activeInferenceClient: InferenceCliClient = inferenceClient;
      if (state.connector) {
        activeInferenceClient = rebindInferenceClient({
          client: inferenceClient,
          connector: state.connector,
          signal,
        });
      }

      // Top-level menu loop.
      while (!signal.aborted) {
        const choice = await promptMainMenu({ statusLine: buildStatusLine(state) });
        if (choice === 'quit') {
          break;
        }
        if (choice === 'selectStream') {
          await handleStreamSelectionFlow({
            state,
            streamsService,
            signal,
            logger,
            inferenceClient: activeInferenceClient,
            esClient,
            kibanaClient,
          });
          continue;
        }
        if (choice === 'selectConnector') {
          activeInferenceClient = await handleConnectorSelection({
            state,
            connectorsService,
            signal,
            logger,
            inferenceClient: activeInferenceClient,
          });
          continue;
        }
        if (choice === 'setTimeRange') {
          await handleTimeRangeSelection({ state, logger });
          continue;
        }
      }
    }
  );
}

async function resolveInitialConnector({
  client,
  logger,
}: {
  client: InferenceCliClient;
  logger: Logger;
}): Promise<InferenceConnector | undefined> {
  try {
    const connectorId = client.getConnectorId();
    return await client.getConnectorById(connectorId);
  } catch (error) {
    logger.warn(`Unable to determine active connector: ${(error as Error).message}`);
    return undefined;
  }
}

async function handleStreamSelectionFlow({
  state,
  streamsService,
  signal,
  logger,
  inferenceClient,
  esClient,
  kibanaClient,
}: {
  state: MenuState;
  streamsService: StreamsService;
  signal: AbortSignal;
  logger: Logger;
  inferenceClient: InferenceCliClient;
  esClient: ElasticsearchClient;
  kibanaClient: KibanaClient;
}): Promise<void> {
  while (!signal.aborted) {
    let stream;

    try {
      stream = await selectStream({
        streamsService,
        signal,
        statusLine: buildStatusLine(state),
        currentStreamName: state.stream?.name,
      });
    } catch (error) {
      logger.error(error);
      return;
    }

    if (!stream) {
      return;
    }

    state.stream = stream;
    logger.info(`Selected stream: ${stream.name}`);

    await handleStreamActions({
      state,
      inferenceClient,
      esClient,
      kibanaClient,
      logger,
      signal,
    });
  }
}

async function handleConnectorSelection({
  state,
  connectorsService,
  signal,
  logger,
  inferenceClient,
}: {
  state: MenuState;
  connectorsService: ConnectorsService;
  signal: AbortSignal;
  logger: Logger;
  inferenceClient: InferenceCliClient;
}): Promise<InferenceCliClient> {
  try {
    const connector = await selectConnector({
      connectorsService,
      signal,
      statusLine: buildStatusLine(state),
      currentConnectorId: state.connector?.connectorId,
    });

    if (!connector) {
      return inferenceClient;
    }

    state.connector = connector;
    logger.info(`Selected connector: ${connector.name} (${connector.connectorId})`);
    return rebindInferenceClient({
      client: inferenceClient,
      connector,
      signal,
    });
  } catch (error) {
    logger.error(error);
    return inferenceClient;
  }
}

async function handleTimeRangeSelection({
  state,
  logger,
}: {
  state: MenuState;
  logger: Logger;
}): Promise<void> {
  try {
    const selection = await promptTimeRangeSelection({
      currentId: state.timeRangeId,
      statusLine: buildStatusLine(state),
    });

    if (selection) {
      state.timeRangeId = selection;
      const option = getTimeRangeById(selection);
      logger.info(`Selected time range: ${option.label}`);
    }
  } catch (error) {
    logger.error(error);
  }
}

async function handleStreamActions({
  state,
  inferenceClient,
  esClient,
  kibanaClient,
  logger,
  signal,
}: {
  state: MenuState;
  inferenceClient: InferenceCliClient;
  esClient: ElasticsearchClient;
  kibanaClient: KibanaClient;
  logger: Logger;
  signal: AbortSignal;
}): Promise<void> {
  if (!state.stream) {
    logger.warn('Select a stream before running actions.');
    return;
  }

  try {
    while (!signal.aborted) {
      const item = await selectAction({
        items: buildMenuItems(state),
        statusLine: buildStatusLine(state),
      });

      if (!item) {
        return;
      }

      const outcome = await runStreamMenuItem({
        item,
        state,
        inferenceClient,
        esClient,
        kibanaClient,
        logger,
        signal,
      });

      if (outcome === 'back') {
        return;
      }
    }
  } catch (error) {
    logger.error(error);
  }
}

function buildMenuItems(state: MenuState): StreamMenuItem[] {
  const workflowItems: StreamWorkflowMenuItem[] = [
    wrapWorkflow(partitionStreamWorkflow, {
      id: 'partitionStream',
      label: 'Partition stream',
      description: 'Recommend optimal partitions for the stream.',
    }),
    wrapWorkflow(onboardStreamWorkflow, {
      id: 'onboardStreamFull',
      label: 'Onboard stream (full)',
      description: 'Generate full onboarding assets for the stream.',
    }),
    wrapWorkflow(onboardAnomalyDetectionJobsWorkflow, {
      id: 'onboardAnomalyDetection',
      label: 'Onboard anomaly detection',
      description: 'Generate anomaly detection job suggestions.',
    }),
    wrapWorkflow(onboardDashboardsWorkflow, {
      id: 'onboardDashboards',
      label: 'Onboard dashboards',
      description: 'Recommend dashboards tailored to the stream.',
    }),
    wrapWorkflow(generateNaturalLanguageQueriesWorkflow, {
      id: 'generateNlQueries',
      label: 'Generate NL queries',
      description: 'Produce natural language query templates.',
    }),
    wrapWorkflow(onboardProcessingWorkflow, {
      id: 'onboardProcessing',
      label: 'Onboard processing',
      description: 'Suggest ingest processors for normalization/enrichment.',
    }),
    wrapWorkflow(onboardRulesWorkflow, {
      id: 'onboardRules',
      label: 'Onboard rules',
      description: 'Generate detection & alerting rules.',
    }),
    wrapWorkflow(onboardSLOsWorkflow, {
      id: 'onboardSLOs',
      label: 'Onboard SLOs',
      description: 'Recommend SLO definitions.',
    }),
  ];

  const workflowMenuItems: StreamMenuItem[] = workflowItems.map(
    (wf): StreamMenuItem => ({ kind: 'workflow', workflow: wf })
  );

  return [...STREAM_ACTION_ITEMS, ...workflowMenuItems];
}

function wrapWorkflow(
  workflow: any,
  meta: { id: string; label: string; description: string }
): StreamWorkflowMenuItem {
  return {
    id: meta.id,
    label: meta.label,
    description: meta.description,
    async generate(context) {
      const streamDef = context.stream;
      const result = await workflow.generate(
        {
          start: context.start,
          end: context.end,
          logger: context.logger,
          signal: context.signal,
          inferenceClient: context.inferenceClient as any,
          esClient: context.esClient,
          services: {
            streams: {
              updateStream: async () => streamDef as any,
              processing: { generatePipeline: async () => ({}) } as any,
            },
          },
        },
        { stream: { definition: streamDef } }
      );
      return { change: result.change };
    },
    async apply(context, change) {
      // Call apply with same input; real side-effects would be implemented inside workflows.
      const streamDef = context.stream;
      await workflow.apply(
        {
          start: context.start,
          end: context.end,
          logger: context.logger,
          signal: context.signal,
          inferenceClient: context.inferenceClient as any,
          esClient: context.esClient,
          services: {
            streams: {
              updateStream: async () => streamDef as any,
              processing: { generatePipeline: async () => ({}) } as any,
            },
          },
        },
        { stream: { definition: streamDef } },
        change
      );
      return { status: 'success' };
    },
  };
}

async function runStreamMenuItem({
  item,
  state,
  inferenceClient,
  esClient,
  kibanaClient,
  logger,
  signal,
}: {
  item: StreamMenuItem;
  state: MenuState;
  inferenceClient: InferenceCliClient;
  esClient: ElasticsearchClient;
  kibanaClient: KibanaClient;
  logger: Logger;
  signal: AbortSignal;
}): Promise<'continue' | 'back'> {
  if (!state.stream) {
    logger.warn('Select a stream before running actions.');
    return 'back';
  }

  try {
    const timeRange = getTimeRangeById(state.timeRangeId);
    const { start, end } = computeTimeRangeBounds(timeRange);

    if (item.kind === 'action') {
      const action = item.action;
      logger.info(`Running action: ${action.label}`);
      const result = await withActiveInferenceSpan('RunStreamAction', () =>
        action
          .run({
            inferenceClient,
            esClient,
            logger,
            signal,
            stream: state.stream!,
            start,
            end,
            kibanaClient,
            services: {
              kibanaClient,
            },
          })
          .catch((error) => {
            logger.error(error);
            return { label: 'Error', body: error.message } as StreamActionResult;
          })
      );
      printActionResult({ action, result, logger });
      return waitForActionResultReview();
    } else {
      const wf = item.workflow;
      logger.info(`Generating workflow change: ${wf.label}`);
      const changeResult = await wf.generate({
        inferenceClient,
        esClient,
        logger,
        signal,
        stream: state.stream!,
        start,
        end,
        kibanaClient,
        services: { kibanaClient },
      });
      printWorkflowChange({ workflow: wf, change: changeResult.change, logger });
      // Interactive review: allow user to apply or go back while keeping output visible.
      const decision = await waitForWorkflowDecision();
      if (decision === 'back') {
        return 'back';
      }
      if (decision === 'apply') {
        logger.info('Applying workflow change...');
        await wf.apply(
          {
            inferenceClient,
            esClient,
            logger,
            signal,
            stream: state.stream!,
            start,
            end,
            kibanaClient,
            services: { kibanaClient },
          },
          changeResult.change
        );
        logger.info('Workflow apply completed.');
        const postApply = await waitForWorkflowDecision({ applyPhase: true });
        if (postApply === 'back') {
          return 'back';
        }
      }
      return 'continue';
    }
  } catch (error) {
    logger.error(error);
    return 'continue';
  }
}

function rebindInferenceClient({
  client,
  connector,
  signal,
}: {
  client: InferenceCliClient;
  connector: InferenceConnector;
  signal: AbortSignal;
}): InferenceCliClient {
  const rebound = client.bindTo({
    connectorId: connector.connectorId,
    functionCalling: 'auto',
  });

  return {
    ...rebound,
    getLangChainChatModel: () =>
      new InferenceChatModel({
        connector,
        chatComplete: rebound.chatComplete,
        signal,
      }),
  } satisfies InferenceCliClient;
}

function buildStatusLine(state: MenuState): string {
  const timeRange = getTimeRangeById(state.timeRangeId);

  return renderStatusLine({
    timeRange,
    connector: state.connector
      ? { name: state.connector.name, id: state.connector.connectorId }
      : undefined,
    stream: state.stream ? { label: formatStreamLabel(state.stream) } : undefined,
  });
}

function printActionResult({
  action,
  result,
  logger,
}: {
  action: StreamAction;
  result: StreamActionResult;
  logger: Logger;
}) {
  const bodyAsString =
    typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2);
  process.stdout.write(bodyAsString + '\n');
}

function printWorkflowChange({
  workflow,
  change,
  logger,
}: {
  workflow: StreamWorkflowMenuItem;
  change: unknown;
  logger: Logger;
}) {
  logger.info(`\n=== ${workflow.label} (generated change) ===`);
  logger.info(JSON.stringify(change, null, 2));
  logger.info('');
}

async function waitForWorkflowDecision(
  options: { applyPhase?: boolean } = {}
): Promise<'apply' | 'continue' | 'back'> {
  const { stdin, stdout } = process;
  const applyPhase = options.applyPhase ?? false;
  const message = applyPhase
    ? '\nPress Enter to return to the menu, or press q to choose another stream.\n'
    : '\nPress a to apply, Enter to return to the menu, or q to choose another stream.\n';

  if (!stdin.isTTY) {
    const input = await promptInput({
      message: applyPhase
        ? 'Press Enter to return (q to choose another stream)'
        : 'Apply change? (a = apply, Enter = back, q = choose another stream)',
      allowEmpty: true,
    });
    if (input === BACK_OPTION_VALUE) return 'back';
    if (!applyPhase && input.toLowerCase() === 'a') return 'apply';
    return 'continue';
  }

  stdout.write(message);

  return new Promise<'apply' | 'continue' | 'back'>((resolve) => {
    const wasPaused = stdin.isPaused();
    const previousRawMode = stdin.isRaw ?? false;

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (typeof stdin.setRawMode === 'function') {
        stdin.setRawMode(previousRawMode);
      }
      if (wasPaused) {
        stdin.pause();
      }
    };

    const onData = (chunk: Buffer) => {
      const input = chunk.toString();
      if (input === '\u0003') {
        cleanup();
        process.kill(process.pid, 'SIGINT');
        return;
      }
      if (input === '\r' || input === '\n') {
        cleanup();
        resolve('continue');
        return;
      }
      if (!applyPhase && input.toLowerCase() === 'a') {
        cleanup();
        resolve('apply');
        return;
      }
      if (input.toLowerCase() === 'q') {
        cleanup();
        resolve('back');
        return;
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function waitForActionResultReview(): Promise<'continue' | 'back'> {
  const { stdin, stdout } = process;
  const promptMessage =
    '\nPress Enter to return to the actions menu, or press q to choose another stream.\n';

  if (!stdin.isTTY) {
    const input = await promptInput({
      message: promptMessage.trim(),
      allowEmpty: true,
    });
    return input === BACK_OPTION_VALUE ? 'back' : 'continue';
  }

  stdout.write(promptMessage);

  return new Promise<'continue' | 'back'>((resolve) => {
    const wasPaused = stdin.isPaused();
    const previousRawMode = stdin.isRaw ?? false;

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (typeof stdin.setRawMode === 'function') {
        stdin.setRawMode(previousRawMode);
      }
      if (wasPaused) {
        stdin.pause();
      }
    };

    const onData = (chunk: Buffer) => {
      const input = chunk.toString();

      if (input === '\u0003') {
        cleanup();
        process.kill(process.pid, 'SIGINT');
        return;
      }

      if (input === '\r' || input === '\n') {
        cleanup();
        resolve('continue');
        return;
      }

      if (input.toLowerCase() === 'q') {
        cleanup();
        resolve('back');
      }
    };

    stdin.setRawMode(true);
    stdin.resume();

    stdin.on('data', onData);
  });
}
