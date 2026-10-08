/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import dedent from 'dedent';
import { AI_INSIGHTS_STATUS } from '../../../common/ai_insights/constants';
import type {
  AiInsightsDashboardContext,
  AiInsightsRequestBody,
  AiInsightsResult,
  AiInsightsStatus,
} from '../../../common/ai_insights/types';
import { prefetchDataSourceMetrics } from './prefetch_data_source_metrics';
import { prefetchEsqlForPanels } from './prefetch_esql';
import { AI_INSIGHTS_SYSTEM_PROMPT, buildAiInsightsUserPrompt } from './prompts';

const STATUS_VALUES = new Set<string>(Object.values(AI_INSIGHTS_STATUS));

function asStatus(value: unknown): AiInsightsStatus {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (STATUS_VALUES.has(normalized)) {
      return normalized as AiInsightsStatus;
    }
  }
  return AI_INSIGHTS_STATUS.yellow;
}

function buildContextXml({
  dashboard,
  timeRange,
  query,
  filtersSummary,
  esqlResults,
  dataSourceMetrics,
}: {
  dashboard: AiInsightsDashboardContext;
  timeRange: AiInsightsRequestBody['time_range'];
  query?: string;
  filtersSummary?: string;
  esqlResults: unknown;
  dataSourceMetrics: unknown;
}): string {
  return dedent`
    <Dashboard>
    <Title>${dashboard.title || 'Untitled dashboard'}</Title>
    <Description>${dashboard.description || ''}</Description>
    <TimeRange from="${timeRange.from}" to="${timeRange.to}" />
    <Query>${query || ''}</Query>
    <Filters>${filtersSummary || ''}</Filters>
    <Panels>
    \`\`\`json
    ${JSON.stringify(dashboard.panels, null, 2)}
    \`\`\`
    </Panels>
    <DataSources>
    \`\`\`json
    ${JSON.stringify(dashboard.data_sources, null, 2)}
    \`\`\`
    </DataSources>
    <PrefetchedDataSourceMetrics>
    \`\`\`json
    ${JSON.stringify(dataSourceMetrics, null, 2)}
    \`\`\`
    </PrefetchedDataSourceMetrics>
    <PrefetchedEsqlResults>
    \`\`\`json
    ${JSON.stringify(esqlResults, null, 2)}
    \`\`\`
    </PrefetchedEsqlResults>
    </Dashboard>
  `;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function extractJsonObject(content: string): Record<string, unknown> | undefined {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1]?.trim(), content.trim()].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try next candidate
    }
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function toInsightResult(content: string): AiInsightsResult {
  const parsed = extractJsonObject(content);
  if (!parsed) {
    return {
      status: AI_INSIGHTS_STATUS.yellow,
      summary: content.trim() || 'No insight was generated for this dashboard context.',
      attention_points: [],
      suggested_actions: [],
    };
  }

  return {
    status: asStatus(parsed.status),
    summary:
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary
        : 'No summary was generated for this dashboard context.',
    attention_points: asStringArray(parsed.attention_points).slice(0, 3),
    suggested_actions: asStringArray(parsed.suggested_actions).slice(0, 3),
  };
}

export async function generateDashboardAiInsight({
  inferenceClient,
  esClient,
  logger,
  body,
}: {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  body: AiInsightsRequestBody;
}): Promise<AiInsightsResult> {
  const [esqlResults, dataSourceMetrics] = await Promise.all([
    prefetchEsqlForPanels({
      esClient,
      panels: body.dashboard.panels,
      logger,
    }),
    prefetchDataSourceMetrics({
      esClient,
      dataSources: body.dashboard.data_sources ?? [],
      timeRange: body.time_range,
      searchQuery: body.search_query,
      filters: body.filters,
      logger,
    }),
  ]);

  const contextXml = buildContextXml({
    dashboard: body.dashboard,
    timeRange: body.time_range,
    query: body.query,
    filtersSummary: body.filters_summary,
    esqlResults,
    dataSourceMetrics,
  });

  const response = await inferenceClient.chatComplete({
    system: dedent`
      ${AI_INSIGHTS_SYSTEM_PROMPT}

      Respond with a single JSON object only (no markdown outside the JSON), using this shape:
      {
        "status": "green" | "yellow" | "red",
        "summary": "1-2 short sentences",
        "attention_points": ["string"],
        "suggested_actions": ["string"]
      }
    `,
    messages: [
      {
        role: MessageRole.User,
        content: buildAiInsightsUserPrompt(contextXml),
      },
    ],
  });

  const content = typeof response.content === 'string' ? response.content : '';
  return toInsightResult(content);
}
