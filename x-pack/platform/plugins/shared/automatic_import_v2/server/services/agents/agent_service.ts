/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { createAutomaticImportAgent } from '../../agents';
import {
  createIngestPipelineGeneratorAgent,
  createLogsAnalyzerAgent,
  textToEcsSubAgent,
} from '../../agents/sub_agents';
import { fetchSamplesTool, createIngestPipelineValidatorTool } from '../../agents/tools';
import type { AutomaticImportSamplesIndexService } from '../samples_index/index_service';
import { INGEST_PIPELINE_GENERATOR_PROMPT } from '../../agents/prompts';

export class AgentService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly samplesIndexService: AutomaticImportSamplesIndexService,
    private readonly model: InferenceChatModel
  ) {}

  /**
   * Invokes the agent with samples fetched from the index.
   * Uses tool-based approach:
   * - Service creates tools with samples and esClient
   * - Agent can fetch samples on demand using fetch_log_samples tool
   * - Validator tool has access to all samples
   * - No samples in context unless agent explicitly requests them (saves tokens)
   *
   * @param integration_id - The integration ID
   * @param data_stream_id - The data stream ID
   */
  public async invoke_deep_agent(integrationId: string, dataStreamId: string) {
    // Fetch samples from the index (decoupled from agent building)
    const samples = await this.samplesIndexService.getSamplesForDataStream(
      integrationId,
      dataStreamId
    );

    // Create tools at the service level
    // Tools capture samples and esClient in their closures
    const fetchSamplesToolInstance = fetchSamplesTool(samples);
    const validatorTool = createIngestPipelineValidatorTool(this.esClient, samples);

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

    // Create and invoke the agent
    const automaticImportAgent = createAutomaticImportAgent({
      model: this.model,
      subagents: [logsAnalyzerSubAgent, pipelineGeneratorSubAgent, textToEcsSubAgent],
    });

    const result = await automaticImportAgent.invoke({
      messages: [
        {
          role: 'user',
          content: `You are tasked with generating an Elasticsearch ingest pipeline for the integration \`${integrationId}\` and data stream \`${dataStreamId}\`.`,
        },
      ],
    });

    return result;
  }
}
