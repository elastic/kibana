/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, LoggerFactory, Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { HumanMessage } from '@langchain/core/messages';
import { createAutomaticImportAgent } from '../../agents';
import {
  createIngestPipelineGeneratorAgent,
  createLogAndEcsAnalyzerAgent,
  createReviewAgent,
} from '../../agents/sub_agents';
import {
  fetchSamplesTool,
  fetchCurrentPipelineTool,
  getEcsInfoTool,
  ingestPipelineValidatorTool,
  testPipelineTool,
  loadEcsFlatData,
  getEcsRootFieldsSummary,
} from '../../agents/tools';
import type { AutomaticImportSamplesIndexService } from '../samples_index/index_service';
import { INGEST_PIPELINE_GENERATOR_PROMPT } from '../../agents/prompts';
import type { LangSmithOptions } from '../../routes/types';

export class AgentService {
  private logger: Logger;

  constructor(
    private readonly samplesIndexService: AutomaticImportSamplesIndexService,
    logger: LoggerFactory
  ) {
    this.logger = logger.get('agentService');
  }

  /**
   * Invokes the deep research agent with samples fetched from the index.
   * Uses tool-based approach:
   * - Service creates tools with samples and esClient
   * - Agent can fetch samples on demand using fetch_log_samples tool
   * - Validator tool has access to all samples
   * - No samples in context unless agent explicitly requests them (saves tokens)
   *
   * @param integration_id - The integration ID
   * @param data_stream_id - The data stream ID
   * @param esClient - The Elasticsearch client
   * @param model - The model to use for the agent
   */
  public async invokeAutomaticImportAgent(
    integrationId: string,
    dataStreamId: string,
    esClient: ElasticsearchClient,
    model: InferenceChatModel,
    langSmithOptions?: LangSmithOptions
  ) {
    this.logger.debug(
      `invokeAutomaticImportAgent: Invoking automatic import agent for integration ${integrationId} and data stream ${dataStreamId}`
    );

    const samples = await this.samplesIndexService.getSamplesForDataStream(
      integrationId,
      dataStreamId
    );

    const fetchSamplesToolInstance = fetchSamplesTool(samples);
    const testPipelineToolInstance = testPipelineTool(esClient, samples);
    const ecsFlatData = await loadEcsFlatData();
    const validatorTool = ingestPipelineValidatorTool({
      esClient,
      samples,
      packageName: integrationId,
      dataStreamName: dataStreamId,
      ecsFlatData,
    });
    const ecsInfoTool = getEcsInfoTool(ecsFlatData);
    const ecsRootFieldsSummary = getEcsRootFieldsSummary(ecsFlatData);

    const logAndEcsAnalyzerSubAgent = createLogAndEcsAnalyzerAgent({
      prompt: `You have access to fetch_log_samples and get_ecs_info tools.

<ecs_root_fields>
The following ECS root field groups are available. Use get_ecs_info with root_fields to drill into any of these:
${ecsRootFieldsSummary}
</ecs_root_fields>

<workflow>
1. Call fetch_log_samples to retrieve 5-10 sample logs
2. Analyze the samples to identify format, fields, and characteristics
3. Use get_ecs_info with relevant root_fields (batch multiple in one call) and field_paths to look up ECS field definitions
4. Provide structured analysis output including ECS mappings and conditional event classification as specified in your system prompt
</workflow>`,
      tools: [fetchSamplesToolInstance, ecsInfoTool],
    });

    const pipelineGeneratorSubAgent = createIngestPipelineGeneratorAgent({
      name: 'ingest_pipeline_generator',
      description:
        'Generates an Elasticsearch ingest pipeline based on log analysis and ECS mappings. Validates and iterates autonomously. The current pipeline and validation results are injected into context automatically on follow-up calls.',
      prompt: INGEST_PIPELINE_GENERATOR_PROMPT,
      tools: [validatorTool, testPipelineToolInstance, fetchSamplesToolInstance],
    });

    const reviewSubAgent = createReviewAgent({
      prompt: `The current pipeline, validation results, sample logs, and processed outputs are injected into your context automatically. Use get_ecs_info to verify ECS field compliance. Use fetch_current_pipeline only if the pipeline was not injected.

<ecs_root_fields>
The following ECS root field groups are available. Use get_ecs_info with root_fields to drill into any of these:
${ecsRootFieldsSummary}
</ecs_root_fields>`,
      tools: [fetchCurrentPipelineTool(), ecsInfoTool],
    });

    const automaticImportAgent = createAutomaticImportAgent({
      model,
      samples,
      subagents: [logAndEcsAnalyzerSubAgent, pipelineGeneratorSubAgent, reviewSubAgent],
    });

    const langSmithTracers =
      langSmithOptions?.apiKey && langSmithOptions?.projectName
        ? getLangSmithTracer({
            apiKey: langSmithOptions.apiKey,
            projectName: langSmithOptions.projectName,
            logger: this.logger,
          })
        : [];

    const result = await automaticImportAgent.invoke(
      {
        messages: [
          new HumanMessage({
            content: `You are tasked with generating an Elasticsearch ingest pipeline for the integration \`${integrationId}\` and data stream \`${dataStreamId}\`.`,
          }),
        ],
      },
      {
        callbacks: [...langSmithTracers],
        runName: 'automatic_import_agent',
        tags: ['automatic_import_agent'],
      }
    );

    return result;
  }
}
