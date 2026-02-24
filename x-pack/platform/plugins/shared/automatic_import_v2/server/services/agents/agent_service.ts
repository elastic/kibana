/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, LoggerFactory, Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { createAutomaticImportAgent } from '../../agents';
import {
  createIngestPipelineGeneratorAgent,
  createLogsAnalyzerAgent,
  createTextToEcsAgent,
} from '../../agents/sub_agents';
import {
  fetchSamplesTool,
  fetchUniqueKeysTool,
  ingestPipelineValidatorTool,
} from '../../agents/tools';
import type { AutomaticImportSamplesIndexService } from '../samples_index/index_service';
import { INGEST_PIPELINE_GENERATOR_PROMPT } from '../../agents/prompts';
import type { LangSmithOptions } from '../../routes/types';
import type { PromptOverrides } from '../../agents/types';

export interface InvokeAutomaticImportAgentOptions {
  /** When set, use these samples instead of fetching from the index (e.g. for GEPA evaluation). */
  samples?: string[];
  /** When set, override the default prompts (e.g. for GEPA optimization). */
  promptOverrides?: PromptOverrides;
}

/** Result of agent invocation; includes final state for evaluation. */
export interface InvokeAutomaticImportAgentResult {
  /** Final graph state from the agent run. */
  state: {
    current_pipeline?: { processors: unknown[]; on_failure?: unknown[] };
    pipeline_generation_results?: unknown[];
    pipeline_validation_results?: {
      success_rate: number;
      successful_samples: number;
      failed_samples: number;
      total_samples: number;
      failure_details: Array<{ error: string; sample: string }>;
    };
  };
  /** Raw invoke result (messages, etc.) for backward compatibility. */
  invokeResult: Awaited<ReturnType<ReturnType<typeof createAutomaticImportAgent>['invoke']>>;
}

export class AgentService {
  private logger: Logger;

  constructor(
    private readonly samplesIndexService: AutomaticImportSamplesIndexService,
    logger: LoggerFactory
  ) {
    this.logger = logger.get('agentService');
  }

  /**
   * Invokes the deep research agent with samples fetched from the index (or inline samples when options.samples is set).
   * Uses tool-based approach:
   * - Service creates tools with samples and esClient
   * - Agent can fetch samples on demand using fetch_log_samples tool
   * - Validator tool has access to all samples
   * - No samples in context unless agent explicitly requests them (saves tokens)
   *
   * @param integrationId - The integration ID
   * @param dataStreamId - The data stream ID
   * @param esClient - The Elasticsearch client
   * @param model - The model to use for the agent
   * @param langSmithOptions - Optional LangSmith tracing
   * @param options - Optional inline samples and/or prompt overrides (e.g. for GEPA evaluation)
   */
  public async invokeAutomaticImportAgent(
    integrationId: string,
    dataStreamId: string,
    esClient: ElasticsearchClient,
    model: InferenceChatModel,
    langSmithOptions?: LangSmithOptions,
    options?: InvokeAutomaticImportAgentOptions
  ): Promise<InvokeAutomaticImportAgentResult> {
    this.logger.debug(
      `invokeAutomaticImportAgent: Invoking automatic import agent for integration ${integrationId} and data stream ${dataStreamId}`
    );

    const samples =
      options?.samples !== undefined && options.samples.length > 0
        ? options.samples
        : await this.samplesIndexService.getSamplesForDataStream(
            integrationId,
            dataStreamId,
            esClient
          );

    const promptOverrides = options?.promptOverrides;

    const logsAnalyzerPrompt =
      promptOverrides?.LOG_ANALYZER_PROMPT !== undefined
        ? promptOverrides.LOG_ANALYZER_PROMPT
        : undefined;
    const pipelineGeneratorPrompt =
      promptOverrides?.INGEST_PIPELINE_GENERATOR_PROMPT ?? INGEST_PIPELINE_GENERATOR_PROMPT;
    const textToEcsPrompt =
      promptOverrides?.TEXT_TO_ECS_PROMPT !== undefined
        ? promptOverrides.TEXT_TO_ECS_PROMPT
        : undefined;
    const orchestratorPrompt = promptOverrides?.AUTOMATIC_IMPORT_AGENT_PROMPT;

    const fetchSamplesToolInstance = fetchSamplesTool(samples);
    const validatorTool = ingestPipelineValidatorTool(esClient, samples);
    const uniqueKeysTool = fetchUniqueKeysTool();

    const logsAnalyzerSubAgent = createLogsAnalyzerAgent({
      prompt: `You have access to the fetch_log_samples tool. Use it to retrieve log samples, then analyze the format and provide structured analysis for ingest pipeline generation.
      <workflow>
        1. Call fetch_log_samples to retrieve 5-10 sample logs
        2. Analyze the samples to identify format, fields, and characteristics
        3. Provide structured analysis output as specified in your system prompt
      </workflow>`,
      tools: [fetchSamplesToolInstance],
      ...(logsAnalyzerPrompt !== undefined ? { systemPromptOverride: logsAnalyzerPrompt } : {}),
    });

    const pipelineGeneratorSubAgent = createIngestPipelineGeneratorAgent({
      name: 'ingest_pipeline_generator',
      description:
        'Generates an Elasticsearch ingest pipeline for the provided log samples and documentation.',
      prompt: pipelineGeneratorPrompt,
      tools: [validatorTool],
      sampleCount: samples.length,
    });

    const textToEcsSubAgent = createTextToEcsAgent({
      prompt:
        'You may call tools as needed to inspect recent pipeline outputs and gather sample field values before proposing ECS mappings.',
      tools: [uniqueKeysTool],
      ...(textToEcsPrompt !== undefined ? { systemPromptOverride: textToEcsPrompt } : {}),
    });

    const automaticImportAgent = createAutomaticImportAgent({
      model,
      subagents: [logsAnalyzerSubAgent, pipelineGeneratorSubAgent, textToEcsSubAgent],
      ...(orchestratorPrompt !== undefined ? { messageModifier: orchestratorPrompt } : {}),
    });

    const langSmithTracers =
      langSmithOptions?.apiKey && langSmithOptions?.projectName
        ? getLangSmithTracer({
            apiKey: langSmithOptions.apiKey,
            projectName: langSmithOptions.projectName,
            logger: this.logger,
          })
        : [];

    const invokeResult = await automaticImportAgent.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `You are tasked with generating an Elasticsearch ingest pipeline for the integration \`${integrationId}\` and data stream \`${dataStreamId}\`.`,
          },
        ],
      },
      {
        callbacks: [...langSmithTracers],
        runName: 'automatic_import_agent',
        tags: ['automatic_import_agent'],
      }
    );

    const rawState =
      (invokeResult as { state?: InvokeAutomaticImportAgentResult['state'] }).state ?? invokeResult;

    return {
      state: {
        current_pipeline:
          (rawState as InvokeAutomaticImportAgentResult['state']).current_pipeline ?? undefined,
        pipeline_generation_results:
          (rawState as InvokeAutomaticImportAgentResult['state']).pipeline_generation_results ??
          undefined,
        pipeline_validation_results:
          (rawState as InvokeAutomaticImportAgentResult['state']).pipeline_validation_results ??
          undefined,
      },
      invokeResult,
    };
  }
}
