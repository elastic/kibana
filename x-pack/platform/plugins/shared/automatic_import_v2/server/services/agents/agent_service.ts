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
    model: InferenceChatModel
  ) {
    this.logger.debug(
      `invokeAutomaticImportAgent: Invoking automatic import agent for integration ${integrationId} and data stream ${dataStreamId}`
    );

    // Fetch samples from the index (decoupled from agent building)
    const samples = await this.samplesIndexService.getSamplesForDataStream(
      integrationId,
      dataStreamId,
      esClient
    );

    // Create tools at the service level
    // Tools capture samples and esClient in their closures
    const fetchSamplesToolInstance = fetchSamplesTool(samples);
    const validatorTool = ingestPipelineValidatorTool(esClient, samples);
    const uniqueKeysTool = fetchUniqueKeysTool();

    // Create the sub agents with tools
    const logsAnalyzerSubAgent = createLogsAnalyzerAgent({
      prompt: `You have access to the fetch_log_samples tool. Use it to retrieve log samples, then analyze the format and provide structured analysis for ingest pipeline generation.
      <workflow>
        1. Call fetch_log_samples to retrieve 5-10 sample logs
        2. Analyze the samples to identify format, fields, and characteristics
        3. Provide structured analysis output as specified in your system prompt
      </workflow>`,
      tools: [fetchSamplesToolInstance],
    });

    const pipelineGeneratorSubAgent = createIngestPipelineGeneratorAgent({
      name: 'ingest_pipeline_generator',
      description:
        'Generates an Elasticsearch ingest pipeline for the provided log samples and documentation.',
      prompt: INGEST_PIPELINE_GENERATOR_PROMPT,
      tools: [validatorTool],
      sampleCount: samples.length,
    });

    const textToEcsSubAgent = createTextToEcsAgent({
      prompt:
        'You may call tools as needed to inspect recent pipeline outputs and gather sample field values before proposing ECS mappings.',
      tools: [uniqueKeysTool],
    });

    // Create and invoke the agent
    const automaticImportAgent = createAutomaticImportAgent({
      model,
      subagents: [logsAnalyzerSubAgent, pipelineGeneratorSubAgent, textToEcsSubAgent],
    });

    const traceOptions = {
      tracers: [
        ...getLangSmithTracer({
          // TODO: Get apiKey from config
          apiKey: 'apiKey',
          projectName: 'projectName',
          logger: this.logger,
        }),
      ],
    };

    const result = await automaticImportAgent.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `You are tasked with generating an Elasticsearch ingest pipeline for the integration \`${integrationId}\` and data stream \`${dataStreamId}\`.`,
          },
        ],
      },
      {
        callbacks: [...(traceOptions.tracers ?? [])],
        runName: 'automatic_import_agent',
        tags: ['automatic_import_agent'],
      }
    );

    return result;
  }
}
