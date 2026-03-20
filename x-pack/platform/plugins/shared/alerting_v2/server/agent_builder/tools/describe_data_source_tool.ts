/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { parse as parseDateMath } from '@kbn/datemath';
import {
  describeDataset,
  formatDocumentAnalysis,
  getLogPatterns,
  getSampleDocuments,
} from '@kbn/ai-tools';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { getFlattenedObject } from '@kbn/std';
import {
  createKnowledgeIndicatorPrompt,
  type KnowledgeIndicator,
} from './knowledge_indicator_prompt';
import {
  DATA_SOURCE_DESCRIPTION_TYPE,
  type DataSourceDescriptionData,
} from '../../../common/attachment_types';

const LOG_MESSAGE_FIELDS = ['message', 'body.text'];
const ERROR_KEYWORDS = ['error', 'exception'];
const MAX_PATTERNS = 10;
const ERROR_SAMPLE_SIZE = 5;
const GENERAL_SAMPLE_SIZE = 20;
const STREAMS_FEATURES_INDEX = '.kibana_streams_features';

const ERROR_FILTER: QueryDslQueryContainer = {
  bool: {
    should: [
      { term: { 'log.level': 'error' } },
      ...LOG_MESSAGE_FIELDS.flatMap((field) =>
        ERROR_KEYWORDS.map((keyword) => ({ match_phrase: { [field]: keyword } }))
      ),
    ],
    minimum_should_match: 1,
  },
};

const describeDataSourceSchema = z.object({
  index: z
    .string()
    .describe(
      'Index, data stream, or alias to describe. Supports cross-cluster search (CCS) ' +
        'patterns like "remote_cluster:logs-*". Use the exact name returned by discover_data_sources.'
    ),
  start: z
    .string()
    .optional()
    .describe('Start of time range (date math, e.g. "now-24h"). Defaults to "now-24h".'),
  end: z.string().optional().describe('End of time range. Defaults to "now".'),
  extract_knowledge_indicators: z
    .boolean()
    .optional()
    .describe(
      'When true, extract knowledge indicators that characterise the application architecture — ' +
        'entities, infrastructure, technology, dependencies, and schema type. ' +
        'Reuses existing indicators from the streams plugin when available, ' +
        'otherwise falls back to LLM-based extraction from sample documents. Defaults to false.'
    ),
});

function resolveTimeRange(start?: string, end?: string): { startMs: number; endMs: number } {
  const now = Date.now();
  const startMs = parseDateMath(start ?? 'now-24h')?.valueOf() ?? now - 24 * 60 * 60 * 1000;
  const endMs = parseDateMath(end ?? 'now')?.valueOf() ?? now;
  return { startMs, endMs };
}

function flattenHit(hit: {
  fields?: Record<string, unknown>;
  _source?: Record<string, unknown>;
}): Record<string, unknown> {
  const source = hit._source ? getFlattenedObject(hit._source) : {};
  return { ...hit.fields, ...source };
}

function stripCcsPrefix(index: string): string {
  return index.includes(':') ? index.split(':').slice(1).join(':') : index;
}

interface OkResult<T> {
  ok: true;
  value: T;
}
interface ErrResult {
  ok: false;
  error: string;
}
type Result<T> = OkResult<T> | ErrResult;

interface KnowledgeIndicatorsResult {
  indicators: KnowledgeIndicator[];
  source: 'index' | 'llm';
}

async function lookupStoredIndicators(
  esClient: { search: Function },
  index: string
): Promise<Result<KnowledgeIndicatorsResult>> {
  try {
    const streamName = stripCcsPrefix(index);
    const response = await (esClient as any).search({
      index: STREAMS_FEATURES_INDEX,
      size: 100,
      query: {
        bool: {
          filter: [
            { term: { 'stream.name': streamName } },
            {
              bool: {
                should: [
                  { bool: { must_not: { exists: { field: 'feature.expires_at' } } } },
                  { range: { 'feature.expires_at': { gte: Date.now() } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      sort: [{ 'feature.confidence': { order: 'desc' as const } }],
    });

    const hits = response.hits?.hits ?? [];
    if (hits.length === 0) {
      return { ok: true, value: { indicators: [], source: 'index' } };
    }

    const indicators: KnowledgeIndicator[] = hits.map((hit: { _source: Record<string, any> }) => {
      const f = hit._source?.feature ?? {};
      return {
        id: f.id ?? '',
        type: f.type ?? '',
        subtype: f.subtype ?? '',
        title: f.title ?? '',
        description: f.description ?? '',
        properties: f.properties ?? {},
        confidence: f.confidence ?? 0,
        evidence: f.evidence ?? [],
        tags: f.tags ?? [],
        ...(f.meta ? { meta: f.meta } : {}),
      };
    });

    return { ok: true, value: { indicators, source: 'index' } };
  } catch {
    return { ok: true, value: { indicators: [], source: 'index' } };
  }
}

async function extractViaLlm(
  modelProvider: { getDefaultModel: () => Promise<{ inferenceClient: any }> },
  sampleDocs: Record<string, unknown>[],
  schemaSummary: string
): Promise<Result<KnowledgeIndicatorsResult>> {
  try {
    const { inferenceClient } = await modelProvider.getDefaultModel();
    const prompt = createKnowledgeIndicatorPrompt();

    const response = await inferenceClient.prompt({
      input: {
        sample_documents: JSON.stringify(sampleDocs),
        schema_summary: schemaSummary,
      },
      prompt,
    });

    const indicators: KnowledgeIndicator[] = response.toolCalls
      .flatMap(
        (toolCall: { function: { arguments: { knowledge_indicators?: unknown[] } } }) =>
          toolCall.function.arguments.knowledge_indicators ?? []
      )
      .filter(
        (ki: Record<string, unknown>) =>
          ki.id &&
          ki.type &&
          ki.properties &&
          typeof ki.properties === 'object' &&
          Object.keys(ki.properties as object).length > 0
      );

    return { ok: true, value: { indicators, source: 'llm' } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export const describeDataSourceTool = (): BuiltinToolDefinition<
  typeof describeDataSourceSchema
> => ({
  id: `${internalNamespaces.alertingV2}.describe_data_source`,
  type: ToolType.builtin,
  description:
    'Describe an index or data stream by analysing its schema, log message patterns, ' +
    'and error signatures. Optionally extract knowledge indicators that characterise the ' +
    'application architecture. Supports cross-cluster search (CCS) — pass CCS-prefixed names ' +
    'like "remote_cluster:logs-*" as returned by discover_data_sources.',
  tags: ['alerting'],
  schema: describeDataSourceSchema,
  handler: async (
    { index, start, end, extract_knowledge_indicators: extractKI },
    { esClient, logger, events, modelProvider, attachments }
  ) => {
    events.reportProgress('Describing data source...');

    const { startMs, endMs } = resolveTimeRange(start, end);

    const tracedClient = createTracedEsClient({
      client: esClient.asCurrentUser,
      logger,
      plugin: 'alerting_v2',
    });

    const parallelTasks: [
      Promise<Result<unknown>>,
      Promise<Result<Array<Record<string, unknown>>>>,
      Promise<Result<Array<Record<string, unknown>>>>,
      Promise<Result<KnowledgeIndicatorsResult>> | null
    ] = [
      describeDataset({
        esClient: esClient.asCurrentUser,
        index,
        start: startMs,
        end: endMs,
      })
        .then(
          (analysis): OkResult<unknown> => ({
            ok: true,
            value: formatDocumentAnalysis(analysis, { dropEmpty: true }),
          })
        )
        .catch((err): ErrResult => ({ ok: false, error: err.message })),

      getLogPatterns({
        esClient: tracedClient,
        index,
        start: startMs,
        end: endMs,
        fields: LOG_MESSAGE_FIELDS,
      })
        .then(
          (patterns): OkResult<Array<Record<string, unknown>>> => ({
            ok: true,
            value: patterns
              .slice(0, MAX_PATTERNS)
              .map(({ field, pattern, regex, count, sample }) => ({
                field,
                pattern,
                regex,
                count,
                sample,
              })),
          })
        )
        .catch((err): ErrResult => ({ ok: false, error: err.message })),

      getSampleDocuments({
        esClient: esClient.asCurrentUser,
        index,
        start: startMs,
        end: endMs,
        size: ERROR_SAMPLE_SIZE,
        filter: ERROR_FILTER,
      })
        .then(
          ({ hits }): OkResult<Array<Record<string, unknown>>> => ({
            ok: true,
            value: hits.map(flattenHit),
          })
        )
        .catch((err): ErrResult => ({ ok: false, error: err.message })),

      extractKI ? lookupStoredIndicators(esClient.asCurrentUser, index) : null,
    ];

    const [schemaResult, patternsResult, errorSamplesResult, storedKIResult] = await Promise.all(
      parallelTasks.map((t) => t ?? Promise.resolve(null))
    );

    let knowledgeIndicatorsResult: Result<KnowledgeIndicatorsResult> | undefined;

    if (extractKI) {
      const stored = storedKIResult as Result<KnowledgeIndicatorsResult>;
      if (stored.ok && stored.value.indicators.length > 0) {
        events.reportProgress(
          `Found ${stored.value.indicators.length} existing knowledge indicator(s) from streams plugin.`
        );
        knowledgeIndicatorsResult = stored;
      } else {
        events.reportProgress('No existing knowledge indicators found. Extracting via LLM...');

        const schemaSummary =
          schemaResult && schemaResult.ok
            ? typeof schemaResult.value === 'string'
              ? schemaResult.value
              : JSON.stringify(schemaResult.value)
            : '';

        const generalSamples = await getSampleDocuments({
          esClient: esClient.asCurrentUser,
          index,
          start: startMs,
          end: endMs,
          size: GENERAL_SAMPLE_SIZE,
        })
          .then(({ hits }) => hits.map(flattenHit))
          .catch(() => [] as Array<Record<string, unknown>>);

        knowledgeIndicatorsResult = await extractViaLlm(
          modelProvider,
          generalSamples,
          schemaSummary
        );
      }
    }

    const data: Record<string, unknown> = {
      index,
      timeRange: {
        start: start ?? 'now-24h',
        end: end ?? 'now',
      },
      schema: schemaResult!.ok ? schemaResult!.value : { error: (schemaResult as ErrResult).error },
      logPatterns: patternsResult!.ok
        ? patternsResult!.value
        : { error: (patternsResult as ErrResult).error },
      errorSamples: errorSamplesResult!.ok
        ? errorSamplesResult!.value
        : { error: (errorSamplesResult as ErrResult).error },
    };

    if (knowledgeIndicatorsResult) {
      data.knowledgeIndicators = knowledgeIndicatorsResult.ok
        ? {
            indicators: knowledgeIndicatorsResult.value.indicators,
            source: knowledgeIndicatorsResult.value.source,
          }
        : { error: knowledgeIndicatorsResult.error };
    }

    const existing = attachments.getActive().find((a) => {
      if (a.type !== DATA_SOURCE_DESCRIPTION_TYPE) return false;
      const latest = a.versions[a.versions.length - 1];
      return (latest?.data as Record<string, unknown>)?.index === index;
    });

    const existingData = existing
      ? (existing.versions[existing.versions.length - 1]?.data as DataSourceDescriptionData)
      : undefined;

    const attachmentData: DataSourceDescriptionData = {
      index,
      timeRange: { start: start ?? 'now-24h', end: end ?? 'now' },
      esqlQuery: `FROM ${index} | LIMIT 100`,
      schema: data.schema,
      logPatterns: Array.isArray(data.logPatterns) ? data.logPatterns : [],
      errorSamples: Array.isArray(data.errorSamples) ? data.errorSamples : [],
      ...(existingData?.docCount != null ? { docCount: existingData.docCount } : {}),
      ...(existingData?.dataSourceType ? { dataSourceType: existingData.dataSourceType } : {}),
      ...(data.knowledgeIndicators &&
      !('error' in (data.knowledgeIndicators as Record<string, unknown>))
        ? {
            knowledgeIndicators:
              data.knowledgeIndicators as DataSourceDescriptionData['knowledgeIndicators'],
          }
        : {}),
    };

    let attachmentId: string;
    if (existing) {
      await attachments.update(existing.id, { data: attachmentData });
      attachmentId = existing.id;
    } else {
      const attachment = await attachments.add({
        type: DATA_SOURCE_DESCRIPTION_TYPE,
        data: attachmentData,
        description: `Data source: ${index}`,
      });
      attachmentId = attachment.id;
    }

    (data as Record<string, unknown>).attachmentId = attachmentId;
    (data as Record<string, unknown>)._renderInstructions = [
      'IMPORTANT: You MUST start your response with the render tag below as the VERY FIRST LINE.',
      'Do NOT write any text before it. The tag must be the first thing in your message.',
      'After the tag, leave a blank line, then write your analysis.',
      '',
      'Your response MUST start exactly like this:',
      '',
      `<render_attachment id="${attachmentId}"/>`,
      '',
      'Here is what I found about the data source...',
    ].join('\n');

    return {
      results: [{ type: ToolResultType.other, data }],
    };
  },
});
