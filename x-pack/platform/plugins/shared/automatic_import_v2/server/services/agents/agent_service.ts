/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, LoggerFactory, Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { estypes } from '@elastic/elasticsearch';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
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
import { INGEST_PIPELINE_GENERATOR_PROMPT, PIPELINE_EDITOR_PROMPT } from '../../agents/prompts';
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

    return result;
  }

  /**
   * Single-call pipeline editor: sends the pipeline, samples, and user request to
   * the LLM in one shot, then validates the result server-side via ES simulate.
   */
  public async invokePipelineEditor(
    integrationId: string,
    dataStreamId: string,
    esClient: ElasticsearchClient,
    model: InferenceChatModel,
    currentPipeline: Record<string, unknown>,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>
  ) {
    this.logger.debug(
      `invokePipelineEditor: Invoking pipeline editor for integration ${integrationId}, data stream ${dataStreamId}`
    );

    const allSamples = await this.samplesIndexService.getSamplesForDataStream(
      integrationId,
      dataStreamId,
      esClient
    );
    const samples = allSamples.slice(0, 3);

    const humanContent = [
      `## Current pipeline\n\`\`\`json\n${JSON.stringify(currentPipeline, null, 2)}\n\`\`\``,
      samples.length > 0
        ? `## Log samples (${samples.length})\n${samples
            .map((s, i) => `Sample ${i + 1}: ${s}`)
            .join('\n')}`
        : '',
      `## User request\n${userMessage}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const messages = [
      new SystemMessage(PIPELINE_EDITOR_PROMPT),
      ...conversationHistory.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new SystemMessage(m.content)
      ),
      new HumanMessage(humanContent),
    ];

    const result = await model.invoke(messages);

    const responseText =
      typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

    const pipelineMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    let updatedPipeline: Record<string, unknown>;
    try {
      updatedPipeline = pipelineMatch ? JSON.parse(pipelineMatch[1].trim()) : currentPipeline;
    } catch {
      updatedPipeline = currentPipeline;
    }

    const explanation = pipelineMatch
      ? responseText.replace(/```json\s*[\s\S]*?```/, '').trim()
      : responseText;

    const validationResults = await this.validatePipelineServerSide(
      esClient,
      updatedPipeline,
      allSamples
    );

    return { updatedPipeline, explanation, validationResults };
  }

  private async validatePipelineServerSide(
    esClient: ElasticsearchClient,
    pipeline: Record<string, unknown>,
    samples: string[]
  ) {
    const empty = {
      success_rate: 0,
      successful_samples: 0,
      failed_samples: 0,
      total_samples: 0,
      failure_details: [] as Array<{ error: string; sample: string }>,
    };

    if (!samples.length) return empty;

    const docs = samples.map((s) => ({
      _index: 'index',
      _id: 'id',
      _source: { message: s },
    }));

    let response: estypes.IngestSimulateResponse;
    try {
      response = await esClient.ingest.simulate({
        docs,
        pipeline: pipeline as estypes.IngestPipeline,
      });
    } catch (err) {
      return {
        ...empty,
        failed_samples: samples.length,
        total_samples: samples.length,
        failure_details: [
          { error: `Pipeline simulation failed: ${(err as Error).message}`, sample: '' },
        ],
      };
    }

    const failureDetails: Array<{ error: string; sample: string }> = [];
    let successCount = 0;

    response.docs.forEach((doc, idx) => {
      if (!doc || doc.doc?._source?.error) {
        const errorDetail = doc?.doc?._source?.error;
        failureDetails.push({
          sample: samples[idx],
          error: !doc
            ? 'Document was dropped by the pipeline'
            : typeof errorDetail === 'string'
            ? errorDetail
            : JSON.stringify(errorDetail),
        });
      } else {
        successCount++;
      }
    });

    const total = samples.length;
    return {
      success_rate: total > 0 ? (successCount / total) * 100 : 0,
      successful_samples: successCount,
      failed_samples: failureDetails.length,
      total_samples: total,
      failure_details: failureDetails.slice(0, 100),
    };
  }
}
