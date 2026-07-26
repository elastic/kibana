/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import dedent from 'dedent';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { GetScopedClients } from '../../../routes/types';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import { STREAMS_DESIGN_PIPELINE_TOOL_ID as DESIGN_PIPELINE } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import { nlToStreamlang } from './nl_to_streamlang';

const samplesSchema = z
  .union([
    z.object({
      source: z.literal('stream'),
      size: z.number().int().min(1).max(500).optional(),
    }),
    z.object({
      source: z.literal('inline'),
      documents: z.array(z.record(z.string(), z.unknown())),
      status: z.enum(['processed', 'unprocessed']),
    }),
  ])
  .optional()
  .describe(
    'How to obtain sample documents for simulation. ' +
      'Omit to auto-fetch 100 recent documents from the stream (recommended). ' +
      'Use { source: "stream", size: N } to control the sample size. ' +
      'Use { source: "inline", documents: [...], status: "processed"|"unprocessed" } to provide your own.'
  );

const designPipelineSchema = z.object({
  stream_name: z.string().describe('Exact stream name, e.g. "logs.otel.linux"'),
  instruction: z
    .string()
    .describe(
      'Natural language instruction describing what to change in the processing pipeline. ' +
        'Examples: "parse syslog from body.text using grok", ' +
        '"add a date parser for the timestamp field", ' +
        '"remove the convert step for status", ' +
        '"rename attributes.src_ip to source.ip"'
    ),
  samples: samplesSchema,
});

export const createDesignPipelineTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof designPipelineSchema> => ({
  id: DESIGN_PIPELINE,
  type: ToolType.builtin,
  description: dedent(`
    Designs changes to a stream's processing pipeline based on a natural language description. Does NOT apply changes — pass the result to the update stream tool to commit.

    The tool fetches the stream's current pipeline, naming convention (ECS/OTel), and schema internally. It applies your described change to the existing pipeline, simulates it against sample documents, and returns the full proposed pipeline for review.

    **When to use:**
    - Adding new processing steps: "parse Apache logs from body.text using grok"
    - Modifying existing steps: "change the grok pattern to also capture the port"
    - Removing steps: "remove the convert step for status"
    - Building a pipeline from scratch: "parse syslog, extract timestamps, convert types, and clean up temp fields"

    **When NOT to use:**
    - Inspecting the current pipeline: use the inspect streams tool with aspects: ["processing"]
    - Applying the pipeline: pass the returned steps to the update stream tool

    **Important:**
    - Sample documents are fetched automatically from the stream. You do not need to fetch or pass documents.
    - The returned steps array is the COMPLETE proposed pipeline — pass it directly to the update stream tool to replace the stream's processing.
    - Simulation may be partial when existing steps are modified (documents already reflect prior processing).

    **Result:** Returns the complete proposed pipeline, a summary, field changes with sample values, simulation results (success rate, errors, simulation mode), samples info, and any warnings or hints.
  `),
  tags: ['streams'],
  schema: designPipelineSchema,
  handler: async (
    { stream_name: streamName, instruction: changeDescription, samples },
    { request, modelProvider }
  ) => {
    try {
      const { streamsClient, scopedClusterClient, fieldsMetadataClient } = await getScopedClients({
        request,
      });
      const esClient = scopedClusterClient.asCurrentUser;
      const model = await modelProvider.getDefaultModel();

      const result = await nlToStreamlang(
        {
          streamName,
          instruction: changeDescription,
          samples: samples as Parameters<typeof nlToStreamlang>[0]['samples'],
        },
        {
          streamsClient,
          esClient,
          inferenceClient: model.inferenceClient,
          simulatePipeline: async (name, processing, simDocs) =>
            simulateProcessing({
              params: {
                path: { name },
                body: { processing, documents: simDocs as FlattenRecord[] },
              },
              esClient,
              streamsClient,
              fieldsMetadataClient,
            }),
        }
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              stream: streamName,
              ...result,
              status: 'proposal_not_applied',
              note: 'This is a proposed pipeline change. Present the simulation results to the user for review before applying.',
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to design pipeline for stream "${streamName}": ${message}`,
              stream: streamName,
              operation: 'design_pipeline',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
