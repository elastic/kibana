/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { STREAMS_GET_DATA_QUALITY_TOOL_ID } from '../read/get_data_quality';
import { STREAMS_GET_SCHEMA_TOOL_ID } from '../read/get_schema';
import { STREAMS_GET_STREAM_TOOL_ID } from '../read/get_stream';
import { extractToolResult } from './extract_results';

export const STREAMS_DIAGNOSE_DATA_QUALITY_TOOL_ID = 'streams.diagnose_data_quality';

const diagnoseDataQualitySchema = z.object({
  name: z.string().min(1).describe('The name of the stream to diagnose data quality issues for'),
});

interface DataQualityData {
  stream: string;
  totalDocuments: number;
  degradedDocuments: number;
  degradedPercentage: number;
  failedDocuments: number;
  failedPercentage: number;
  qualityScore: string;
  failureStoreStatus: string;
}

interface SchemaData {
  stream: string;
  mappedFields: Record<string, unknown>;
  inheritedFields?: Record<string, unknown>;
  unmappedFields: string[];
}

interface StreamData {
  stream: Record<string, unknown>;
}

interface RootCause {
  cause: string;
  evidence: string;
  fix: string;
  fixTool: string;
}

const identifyRootCauses = ({
  quality,
  schema,
  stream,
}: {
  quality: DataQualityData;
  schema: SchemaData | null;
  stream: StreamData | null;
}): RootCause[] => {
  const rootCauses: RootCause[] = [];

  // Check unmapped fields as cause of degradation
  if (schema) {
    const mappedCount = Object.keys(schema.mappedFields).length;
    const inheritedCount = schema.inheritedFields ? Object.keys(schema.inheritedFields).length : 0;
    const unmappedCount = schema.unmappedFields.length;
    const total = mappedCount + inheritedCount + unmappedCount;
    const unmappedRatio = total > 0 ? unmappedCount / total : 0;

    if (unmappedRatio > 0.3 && quality.degradedPercentage > 5) {
      const topUnmapped = schema.unmappedFields.slice(0, 10);
      rootCauses.push({
        cause: `${unmappedCount} unmapped fields (${Math.round(
          unmappedRatio * 100
        )}% of total) are likely causing document degradation`,
        evidence: `Degraded docs: ${
          quality.degradedPercentage
        }%, unmapped fields include: ${topUnmapped.join(', ')}`,
        fix: `Map the most common unmapped fields to appropriate types`,
        fixTool: 'streams.map_fields',
      });
    } else if (unmappedCount > 0 && quality.degradedPercentage > 0) {
      rootCauses.push({
        cause: `${unmappedCount} unmapped fields may be contributing to document degradation`,
        evidence: `Degraded docs: ${quality.degradedPercentage}%, ${unmappedCount} fields are unmapped`,
        fix: `Map unmapped fields to reduce degradation`,
        fixTool: 'streams.map_fields',
      });
    }
  }

  // Check failure store disabled with failed docs
  if (quality.failedDocuments > 0 && quality.failureStoreStatus !== 'enabled') {
    rootCauses.push({
      cause: `${quality.failedDocuments} documents have failed ingestion and the failure store is ${quality.failureStoreStatus}`,
      evidence: `Failed docs: ${quality.failedDocuments} (${quality.failedPercentage}%), failure store: ${quality.failureStoreStatus}`,
      fix: `Enable the failure store to capture failed documents for investigation instead of losing them`,
      fixTool: 'streams.enable_failure_store',
    });
  }

  // Check no processors with high unmapped count
  if (stream) {
    const ingest = stream.stream.ingest as Record<string, unknown> | undefined;
    const processing = ingest?.processing as Array<unknown> | undefined;
    const hasProcessors = Array.isArray(processing) && processing.length > 0;

    if (!hasProcessors && schema) {
      const unmappedCount = schema.unmappedFields.length;
      const mappedCount = Object.keys(schema.mappedFields).length;
      const inheritedCount = schema.inheritedFields
        ? Object.keys(schema.inheritedFields).length
        : 0;
      const total = mappedCount + inheritedCount + unmappedCount;
      const unmappedRatio = total > 0 ? unmappedCount / total : 0;

      if (unmappedRatio > 0.3) {
        rootCauses.push({
          cause: `No processing pipeline is configured and ${Math.round(
            unmappedRatio * 100
          )}% of fields are unmapped — raw data is not being parsed`,
          evidence: `Processors: none, unmapped fields: ${unmappedCount}/${total}`,
          fix: `Add processors (grok, dissect, or other extractors) to parse and structure the raw data`,
          fixTool: 'streams.update_processors',
        });
      }
    }
  }

  return rootCauses;
};

export function createDiagnoseDataQualityTool(): StaticToolRegistration<
  typeof diagnoseDataQualitySchema
> {
  const toolDefinition: BuiltinToolDefinition<typeof diagnoseDataQualitySchema> = {
    id: STREAMS_DIAGNOSE_DATA_QUALITY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Diagnoses data quality problems for a stream by correlating quality metrics, schema completeness, and processing pipeline state to identify root causes and recommend specific fixes. Use this when the user says "data quality is bad", "help me fix quality", "why are docs degraded/failing?", or reports parsing errors.',
    tags: ['streams'],
    schema: diagnoseDataQualitySchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { toolProvider, request, logger } = context;
      try {
        // Get existing tools via the ToolProvider API
        const [qualityTool, schemaTool, streamTool] = await Promise.all([
          toolProvider.get({ toolId: STREAMS_GET_DATA_QUALITY_TOOL_ID, request }),
          toolProvider.get({ toolId: STREAMS_GET_SCHEMA_TOOL_ID, request }),
          toolProvider.get({ toolId: STREAMS_GET_STREAM_TOOL_ID, request }),
        ]);

        // Execute all sub-tools in parallel
        const results = await Promise.allSettled([
          qualityTool.execute({ toolParams: { name } }),
          schemaTool.execute({ toolParams: { name } }),
          streamTool.execute({ toolParams: { name } }),
        ]);

        // Quality is required — if it fails, we can't diagnose
        const qualityResult =
          results[0].status === 'fulfilled'
            ? extractToolResult<DataQualityData>(results[0].value, 'get_data_quality')
            : null;

        if (!qualityResult?.success) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Could not retrieve data quality metrics for "${name}": ${
                    qualityResult?.success === false ? qualityResult.error : 'tool execution failed'
                  }`,
                },
              },
            ],
          };
        }

        // Schema and stream are optional — degrade gracefully
        const schemaResult =
          results[1].status === 'fulfilled'
            ? extractToolResult<SchemaData>(results[1].value, 'get_schema')
            : null;
        const streamResult =
          results[2].status === 'fulfilled'
            ? extractToolResult<StreamData>(results[2].value, 'get_stream')
            : null;

        const rootCauses = identifyRootCauses({
          quality: qualityResult.data,
          schema: schemaResult?.success ? schemaResult.data : null,
          stream: streamResult?.success ? streamResult.data : null,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                qualityScore: qualityResult.data.qualityScore,
                rootCauses,
                metrics: {
                  totalDocuments: qualityResult.data.totalDocuments,
                  degradedDocuments: qualityResult.data.degradedDocuments,
                  degradedPercentage: qualityResult.data.degradedPercentage,
                  failedDocuments: qualityResult.data.failedDocuments,
                  failedPercentage: qualityResult.data.failedPercentage,
                  failureStoreStatus: qualityResult.data.failureStoreStatus,
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.diagnose_data_quality tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to diagnose data quality for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
