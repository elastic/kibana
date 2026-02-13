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
import { STREAMS_LIST_STREAMS_TOOL_ID } from '../read/list_streams';
import { STREAMS_GET_DATA_QUALITY_TOOL_ID } from '../read/get_data_quality';
import { STREAMS_GET_LIFECYCLE_STATS_TOOL_ID } from '../read/get_lifecycle_stats';
import { extractToolResult } from './extract_results';
import type { ExtractedResult } from './extract_results';
import { scoreQuality, scoreRetention, deriveOverallHealth } from './scoring';
import type { HealthSeverity } from './scoring';
import { createIssue, sortIssuesBySeverity } from './issues';
import type { StreamIssue } from './issues';

export const STREAMS_OVERVIEW_STREAMS_TOOL_ID = 'streams.overview_streams';

const MAX_STREAMS_TO_ASSESS = 50;

const overviewStreamsSchema = z.object({});

interface ListStreamsData {
  total: number;
  streams: Array<{ name: string; description?: string }>;
}

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

interface LifecycleData {
  stream: string;
  lifecycleType: string;
  lifecycle: unknown;
  storageSizeBytes?: number;
  documentCount?: number;
}

interface StreamSummary {
  name: string;
  qualityScore: string | null;
  degradedPct: number | null;
  failedPct: number | null;
  storageSizeBytes: number | null;
  retentionType: string | null;
  overallHealth: HealthSeverity;
  issues: StreamIssue[];
}

const buildStreamSummary = ({
  name,
  quality,
  lifecycle,
}: {
  name: string;
  quality: ExtractedResult<DataQualityData> | null;
  lifecycle: ExtractedResult<LifecycleData> | null;
}): StreamSummary => {
  const issues: StreamIssue[] = [];
  const scores: HealthSeverity[] = [];

  if (quality?.success) {
    const { degradedPercentage, failedPercentage } = quality.data;
    const qualitySeverity = scoreQuality(degradedPercentage, failedPercentage);
    scores.push(qualitySeverity);
    if (qualitySeverity !== 'healthy') {
      issues.push(
        createIssue({
          category: 'quality',
          severity: qualitySeverity,
          summary: `${degradedPercentage}% degraded, ${failedPercentage}% failed documents`,
          recommendation: 'Investigate field mappings and processing pipeline',
          details: { degradedPercentage, failedPercentage },
        })
      );
    }
  }

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
          recommendation: 'Configure a retention policy to manage storage growth',
          details: { lifecycleType: lifecycle.data.lifecycleType },
        })
      );
    }
  }

  return {
    name,
    qualityScore: quality?.success ? quality.data.qualityScore : null,
    degradedPct: quality?.success ? quality.data.degradedPercentage : null,
    failedPct: quality?.success ? quality.data.failedPercentage : null,
    storageSizeBytes: lifecycle?.success ? lifecycle.data.storageSizeBytes ?? null : null,
    retentionType: lifecycle?.success ? lifecycle.data.lifecycleType : null,
    overallHealth: deriveOverallHealth(scores),
    issues: sortIssuesBySeverity(issues),
  };
};

const rankTopIssues = (streamSummaries: StreamSummary[]): StreamIssue[] => {
  const allIssues: Array<StreamIssue & { streamName: string; volume: number }> = [];

  for (const summary of streamSummaries) {
    for (const issue of summary.issues) {
      allIssues.push({
        ...issue,
        streamName: summary.name,
        volume: summary.storageSizeBytes ?? 0,
      });
    }
  }

  // Sort by severity first, then by volume (higher volume = more impactful)
  const severityOrder: Record<HealthSeverity, number> = {
    critical: 0,
    warning: 1,
    healthy: 2,
  };

  allIssues.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.volume - a.volume;
  });

  // Return top 10 issues
  return allIssues.slice(0, 10).map(({ streamName, volume: _volume, ...issue }) => ({
    ...issue,
    summary: `[${streamName}] ${issue.summary}`,
  }));
};

export function createOverviewStreamsTool(): StaticToolRegistration<typeof overviewStreamsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof overviewStreamsSchema> = {
    id: STREAMS_OVERVIEW_STREAMS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Provides a prioritized overview of all streams the user has access to — identifying which ones need attention and what the most impactful issues are across the environment. Use this when the user asks "what do you recommend?", "which streams need attention?", "give me an overview", or "how is my environment doing?".',
    tags: ['streams'],
    schema: overviewStreamsSchema,
    handler: async (_toolParams, context) => {
      const { toolProvider, request, logger } = context;
      try {
        // Step 1: List all streams
        const listTool = await toolProvider.get({
          toolId: STREAMS_LIST_STREAMS_TOOL_ID,
          request,
        });
        const listResult = await listTool.execute({ toolParams: {} });
        const listData = extractToolResult<ListStreamsData>(listResult, 'list_streams');

        if (!listData.success) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Could not list streams: ${listData.error}`,
                },
              },
            ],
          };
        }

        const { streams } = listData.data;
        const totalStreams = streams.length;
        const truncated = totalStreams > MAX_STREAMS_TO_ASSESS;
        const streamsToAssess = streams.slice(0, MAX_STREAMS_TO_ASSESS);

        // Step 2: Get quality and lifecycle for each stream in parallel
        const [qualityTool, lifecycleTool] = await Promise.all([
          toolProvider.get({ toolId: STREAMS_GET_DATA_QUALITY_TOOL_ID, request }),
          toolProvider.get({ toolId: STREAMS_GET_LIFECYCLE_STATS_TOOL_ID, request }),
        ]);

        const assessmentResults = await Promise.allSettled(
          streamsToAssess.map(async (stream) => {
            const [qualityResult, lifecycleResult] = await Promise.allSettled([
              qualityTool.execute({ toolParams: { name: stream.name } }),
              lifecycleTool.execute({ toolParams: { name: stream.name } }),
            ]);

            const quality =
              qualityResult.status === 'fulfilled'
                ? extractToolResult<DataQualityData>(qualityResult.value, 'get_data_quality')
                : null;
            const lifecycle =
              lifecycleResult.status === 'fulfilled'
                ? extractToolResult<LifecycleData>(lifecycleResult.value, 'get_lifecycle_stats')
                : null;

            return buildStreamSummary({ name: stream.name, quality, lifecycle });
          })
        );

        const streamSummaries = assessmentResults
          .filter((r): r is PromiseFulfilledResult<StreamSummary> => r.status === 'fulfilled')
          .map((r) => r.value);

        // Sort streams: critical first, then warning, then healthy
        const healthOrder: Record<HealthSeverity, number> = {
          critical: 0,
          warning: 1,
          healthy: 2,
        };
        streamSummaries.sort((a, b) => healthOrder[a.overallHealth] - healthOrder[b.overallHealth]);

        const topIssues = rankTopIssues(streamSummaries);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                totalStreams,
                assessedStreams: streamSummaries.length,
                truncated,
                streams: streamSummaries,
                topIssues,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.overview_streams tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate streams overview: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
