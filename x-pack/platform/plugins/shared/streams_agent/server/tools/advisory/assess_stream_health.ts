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
import { STREAMS_GET_LIFECYCLE_STATS_TOOL_ID } from '../read/get_lifecycle_stats';
import { STREAMS_GET_STREAM_TOOL_ID } from '../read/get_stream';
import { extractToolResult } from './extract_results';
import type { ExtractedResult } from './extract_results';
import {
  scoreQuality,
  scoreSchema,
  scoreRetention,
  scoreFailureStore,
  scoreProcessing,
  deriveOverallHealth,
} from './scoring';
import type { HealthSeverity } from './scoring';
import { createIssue, sortIssuesBySeverity } from './issues';
import type { StreamIssue } from './issues';

export const STREAMS_ASSESS_STREAM_HEALTH_TOOL_ID = 'streams.assess_stream_health';

const assessStreamHealthSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to assess'),
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

interface LifecycleData {
  stream: string;
  lifecycleType: string;
  lifecycle: unknown;
  storageSizeBytes?: number;
  documentCount?: number;
}

interface StreamData {
  stream: Record<string, unknown>;
}

const buildIssues = ({
  quality,
  schema,
  lifecycle,
  stream,
}: {
  quality: ExtractedResult<DataQualityData> | null;
  schema: ExtractedResult<SchemaData> | null;
  lifecycle: ExtractedResult<LifecycleData> | null;
  stream: ExtractedResult<StreamData> | null;
}): { issues: StreamIssue[]; scores: HealthSeverity[] } => {
  const issues: StreamIssue[] = [];
  const scores: HealthSeverity[] = [];

  // Quality scoring
  if (quality?.success) {
    const { degradedPercentage, failedPercentage, failureStoreStatus, failedDocuments } =
      quality.data;
    const qualitySeverity = scoreQuality(degradedPercentage, failedPercentage);
    scores.push(qualitySeverity);
    if (qualitySeverity !== 'healthy') {
      issues.push(
        createIssue({
          category: 'quality',
          severity: qualitySeverity,
          summary: `${degradedPercentage}% degraded, ${failedPercentage}% failed documents`,
          recommendation: 'Investigate field mappings and processing pipeline for parsing issues',
          details: {
            degradedPercentage,
            failedPercentage,
            totalDocuments: quality.data.totalDocuments,
          },
        })
      );
    }

    // Failure store scoring
    const failureStoreSeverity = scoreFailureStore(
      failureStoreStatus as 'enabled' | 'disabled' | 'inherited' | 'unknown',
      failedDocuments
    );
    scores.push(failureStoreSeverity);
    if (failureStoreSeverity === 'critical') {
      issues.push(
        createIssue({
          category: 'failure_store',
          severity: 'critical',
          summary: `Failure store is ${failureStoreStatus} but ${failedDocuments} documents have failed`,
          recommendation: 'Enable the failure store to capture failed documents for investigation',
          details: { failureStoreStatus, failedDocuments },
        })
      );
    }
  }

  // Schema scoring
  if (schema?.success) {
    const mappedCount = Object.keys(schema.data.mappedFields).length;
    const inheritedCount = schema.data.inheritedFields
      ? Object.keys(schema.data.inheritedFields).length
      : 0;
    const unmappedCount = schema.data.unmappedFields.length;
    const schemaSeverity = scoreSchema(mappedCount + inheritedCount, unmappedCount);
    scores.push(schemaSeverity);
    if (schemaSeverity !== 'healthy') {
      const total = mappedCount + inheritedCount + unmappedCount;
      const unmappedRatio = total > 0 ? Math.round((unmappedCount / total) * 100) : 0;
      issues.push(
        createIssue({
          category: 'schema',
          severity: schemaSeverity,
          summary: `${unmappedCount} unmapped fields (${unmappedRatio}% of total)`,
          recommendation: 'Map the most common unmapped fields to improve data quality',
          details: { mappedCount, inheritedCount, unmappedCount, unmappedRatio },
        })
      );
    }

    // Processing scoring (requires stream definition too)
    const hasProcessors = getHasProcessors(stream);
    const total = mappedCount + inheritedCount + unmappedCount;
    const unmappedRatio = total > 0 ? unmappedCount / total : 0;
    const processingSeverity = scoreProcessing(hasProcessors, unmappedRatio);
    scores.push(processingSeverity);
    if (processingSeverity !== 'healthy') {
      issues.push(
        createIssue({
          category: 'processing',
          severity: processingSeverity,
          summary: 'No processing pipeline configured with high unmapped field ratio',
          recommendation:
            'Consider adding processors to extract and structure fields from raw data',
          details: { hasProcessors, unmappedRatio: Math.round(unmappedRatio * 100) },
        })
      );
    }
  }

  // Retention scoring
  if (lifecycle?.success) {
    const retentionSeverity = scoreRetention(
      lifecycle.data.lifecycleType as 'ilm' | 'dsl' | 'inherit' | 'unknown'
    );
    scores.push(retentionSeverity);
    if (retentionSeverity !== 'healthy') {
      issues.push(
        createIssue({
          category: 'retention',
          severity: retentionSeverity,
          summary: 'No retention policy configured',
          recommendation: 'Set a retention policy to manage storage growth',
          details: {
            lifecycleType: lifecycle.data.lifecycleType,
            storageSizeBytes: lifecycle.data.storageSizeBytes,
          },
        })
      );
    }
  }

  return { issues: sortIssuesBySeverity(issues), scores };
};

const getHasProcessors = (stream: ExtractedResult<StreamData> | null): boolean => {
  if (!stream?.success) {
    return false;
  }
  const def = stream.data.stream;
  // Wired streams have processing under ingest.wired.routing
  // Check for ingest.processing or similar structures
  const ingest = def.ingest as Record<string, unknown> | undefined;
  if (!ingest) {
    return false;
  }
  const processing = ingest.processing as Array<unknown> | undefined;
  return Array.isArray(processing) && processing.length > 0;
};

export function createAssessStreamHealthTool(): StaticToolRegistration<
  typeof assessStreamHealthSchema
> {
  const toolDefinition: BuiltinToolDefinition<typeof assessStreamHealthSchema> = {
    id: STREAMS_ASSESS_STREAM_HEALTH_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Performs a holistic health assessment of a stream — gathering data quality, schema completeness, retention configuration, and processing pipeline state in a single call. Returns a scored health report with identified issues and recommendations. Use this when the user asks "how is my stream doing?", "is this stream healthy?", "check on [stream]", or wants to know if anything needs attention.',
    tags: ['streams'],
    schema: assessStreamHealthSchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { toolProvider, request, logger } = context;
      try {
        // Get existing tools via the ToolProvider API
        const [qualityTool, schemaTool, lifecycleTool, streamTool] = await Promise.all([
          toolProvider.get({ toolId: STREAMS_GET_DATA_QUALITY_TOOL_ID, request }),
          toolProvider.get({ toolId: STREAMS_GET_SCHEMA_TOOL_ID, request }),
          toolProvider.get({ toolId: STREAMS_GET_LIFECYCLE_STATS_TOOL_ID, request }),
          toolProvider.get({ toolId: STREAMS_GET_STREAM_TOOL_ID, request }),
        ]);

        // Execute all sub-tools in parallel
        const results = await Promise.allSettled([
          qualityTool.execute({ toolParams: { name } }),
          schemaTool.execute({ toolParams: { name } }),
          lifecycleTool.execute({ toolParams: { name } }),
          streamTool.execute({ toolParams: { name } }),
        ]);

        // Extract results with graceful degradation
        const qualityResult =
          results[0].status === 'fulfilled'
            ? extractToolResult<DataQualityData>(results[0].value, 'get_data_quality')
            : null;
        const schemaResult =
          results[1].status === 'fulfilled'
            ? extractToolResult<SchemaData>(results[1].value, 'get_schema')
            : null;
        const lifecycleResult =
          results[2].status === 'fulfilled'
            ? extractToolResult<LifecycleData>(results[2].value, 'get_lifecycle_stats')
            : null;
        const streamResult =
          results[3].status === 'fulfilled'
            ? extractToolResult<StreamData>(results[3].value, 'get_stream')
            : null;

        // Track failed dimensions
        const failedDimensions: string[] = [];
        if (!qualityResult?.success) {
          failedDimensions.push('data quality');
        }
        if (!schemaResult?.success) {
          failedDimensions.push('schema');
        }
        if (!lifecycleResult?.success) {
          failedDimensions.push('lifecycle');
        }
        if (!streamResult?.success) {
          failedDimensions.push('stream definition');
        }

        // Build issues and compute health
        const { issues, scores } = buildIssues({
          quality: qualityResult,
          schema: schemaResult,
          lifecycle: lifecycleResult,
          stream: streamResult,
        });

        const overallHealth = deriveOverallHealth(scores);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                overallHealth,
                issues,
                metrics: {
                  quality: qualityResult?.success
                    ? {
                        degradedPct: qualityResult.data.degradedPercentage,
                        failedPct: qualityResult.data.failedPercentage,
                        score: qualityResult.data.qualityScore,
                      }
                    : null,
                  schema: schemaResult?.success
                    ? {
                        mappedCount: Object.keys(schemaResult.data.mappedFields).length,
                        unmappedCount: schemaResult.data.unmappedFields.length,
                        inheritedCount: schemaResult.data.inheritedFields
                          ? Object.keys(schemaResult.data.inheritedFields).length
                          : 0,
                      }
                    : null,
                  lifecycle: lifecycleResult?.success
                    ? {
                        type: lifecycleResult.data.lifecycleType,
                        storageSizeBytes: lifecycleResult.data.storageSizeBytes,
                        documentCount: lifecycleResult.data.documentCount,
                      }
                    : null,
                },
                ...(failedDimensions.length > 0
                  ? {
                      note: `Could not assess: ${failedDimensions.join(
                        ', '
                      )}. Results are based on available data.`,
                    }
                  : {}),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.assess_stream_health tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to assess health for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
