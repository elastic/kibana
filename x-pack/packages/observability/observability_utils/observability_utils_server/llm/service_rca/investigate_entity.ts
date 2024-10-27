/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '@kbn/alerting-plugin/server';
import { InferenceClient, withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import { Logger } from '@kbn/logging';
import { getEntityKuery } from '@kbn/observability-utils-common/entities/get_entity_kuery';
import { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { sortAndTruncateAnalyzedFields } from '@kbn/observability-utils-common/llm/log_analysis/sort_and_truncate_analyzed_fields';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { castArray, groupBy, mapValues, pick } from 'lodash';
import pLimit from 'p-limit';
import { lastValueFrom } from 'rxjs';
import { analyzeDocuments } from '../../entities/analyze_documents';
import { getDataStreamsForEntity } from '../../entities/get_data_streams_for_entity';
import { getAlertsForEntity } from '../../entities/signals/get_alerts_for_entity';
import { getSlosForEntity } from '../../entities/signals/get_slos_for_entity';
import { ObservabilityElasticsearchClient } from '../../es/client/create_observability_es_client';
import {
  AnalyzedLogPattern,
  AnalyzeLogPatternOutput,
  analyzeLogPatterns,
} from '../analyze_log_patterns';
import { findRelatedEntities } from './find_related_entities';
import { ObservationStepSummary } from './observe';
import { stringifySummaries } from './stringify_summaries';
import { RCA_SYSTEM_PROMPT_BASE, SYSTEM_PROMPT_ENTITIES } from './system_prompt_base';
import { formatEntity } from './format_entity';
import { EntityRelationshipDescription, getEntityRelationships } from './get_entity_relationships';

const SYSTEM_PROMPT = `${RCA_SYSTEM_PROMPT_BASE}

${SYSTEM_PROMPT_ENTITIES}`;

const getInputPrompt = ({
  entity,
  summaries,
  dataToAnalyzePrompt,
}: {
  entity: Record<string, string>;
  summaries: ObservationStepSummary[];
  dataToAnalyzePrompt: string;
}) => `

${stringifySummaries(summaries)}

## Entity to investigate

${formatEntity(entity)}

${dataToAnalyzePrompt}

## Entity-Based Investigation: Task Guide

In the investigation process, you are currently investigating the entity
${formatEntity(entity)}. Your task is to inspect the signals from the entity
(alerts, slos, sample documents and log patterns) and note key observations from
those signals, and how they relate to the investigation process.

First, describe the entity characteristics based on the sample documents. Put it
in context of the investigation process. Mention the reason why it's being
investigated, and how it is related other entities that were previously
investigated.

Next, look closely at the log messages, alerts, and slos. This is the most
important part of investigating an entity - especially log patterns are crucial
because they will tell you about changes in the system (both as symptoms and as
causes) and whether things are operating normally. 

For the log patterns, you will be given both log patterns from the current
entity ${formatEntity(entity)}, and log patterns from other entities that
reference the current entity. The latter group of patterns are useful to see if
there's impact on or from other entities.

When analyzing the log patterns, look at A) changes and B)
unusual/warning/critical log messages. Are there deployment changes? Fatal
exceptions? An increase in "unhealthy" log messages? A decrease in "healthy" log
messages? These are patterns to pay attention to.

Use your thoughtful analysis of these log patterns to note key observations. For
each observation, if possible, add an ISO timestamp from the change point. If
there's no change point, don't mention a timestamp at all. For each observation,
make sure to mention the log pattern itself, the significance of the change
(high/medium/low) if it's available, and the semantic classification
(normal/unusual/warning/critical). Then, describe what your observation is -
what it could be indicative of, what impact it could have on the system, etc.
Do not repeat the values for \`series\` or \`count, but you can use them
to reason about the pattern.

Here are some examples:

- "at 2024-01-01T00:00:00.000Z, there was a significant increase (\`high\`) in
messages mentioning a 500 status code, such as \`[Sat Jan 01 00:00:00.00000
2024] [http:error] [pid 12345:tid 1234567890] [client 192.168.1.100:54321]
AH01276: **error** in processing request for URI /api/v1/resource: proxy: HTTP:
returned status 500 Internal Server Error, referer:
http://example.com/request-page\`. The endpoint \`/api/v1/resource\` indicates
it could be related to the resource-service, and the referer
\`http://example.com/request-page\` indicates that the requests originate in a
downstream RUM service."
- "There are frequent log messages indicating a garbage collection issue, such
as \`2024-12-12T12:12:12.121Z WARN [MyApp] High frequency of garbage collections
detected (GC count: 5 in last 10 seconds) - possible memory leak or high object
churn impacting performance\`. There are no changes, but they indicate that the
MyApp service is under memory pressure."
- "At 2020-10-01T01:10:10.001Z, a new container image for my-app was deployed,
as evidenced by the log message \`INFO 2020-10-01T01:10:10.001Z kubelet -
Successfully pulled container image 'my-app:v1.2.3' for pod
'my-app-pod-abcdef12345' in namespace 'default' on node 'node-1'\`. This is a
key event, as an image pull might indicate a new version of the application that
changes the behavior of the system.

Finally, reason about how the significant events could indicate issues with the
entity ,and put it in context of the entire investigation. Do not suggest next
steps - this will happen in a follow-up task.`;

function serializePatterns(patterns: AnalyzedLogPattern[], entityFields?: string[]) {
  const groupedPatterns = groupBy(patterns, (pattern) => pattern.field);

  return Object.entries(groupedPatterns)
    .map(([field, patternsForField]) => {
      return `#### Field: \`${field}\`

      ${JSON.stringify({
        patterns: patternsForField.map((pattern) => {
          return {
            regex: pattern.regex,
            sample: pattern.sample,
            change: {
              type: pattern.change.type,
              significance: pattern.change.significance,
              timestamp: pattern.change.timestamp,
            },
            series: pattern.timeseries.map(({ x, y }) => y),
            count: pattern.count,
            relevance: pattern.relevance,
            ...(entityFields?.length
              ? {
                  entity: mapValues(
                    pick(pattern.metadata, entityFields),
                    (value) => castArray(value)[0] as string
                  ),
                }
              : {}),
          };
        }),
      })}`;
    })
    .join('\n\n');
}

export interface EntityInvestigation {
  entity: Record<string, string>;
  summary: string;
  relationships: EntityRelationshipDescription[];
  attachments: {
    allAnalysis: Array<{
      dataStream: string;
      analysis: TruncatedDocumentAnalysis;
    }>;
    slos: Array<
      Record<string, any> & {
        status: 'VIOLATED' | 'DEGRADED' | 'HEALTHY' | 'NO_DATA';
      }
    >;
    alerts: ParsedTechnicalFields[];
    searchValues: Array<{
      fragments: string[];
      relationship: string;
    }>;
  } & AnalyzeLogPatternOutput;
}

export interface EntityInvestigationParameters {
  start: number;
  end: number;
  esClient: ObservabilityElasticsearchClient;
  alertsClient: AlertsClient;
  rulesClient: RulesClient;
  inferenceClient: InferenceClient;
  sloSummaryIndices: string[];
  logSources: string[];
  spaceId: string;
  connectorId: string;
  entity: Record<string, string>;
  logger: Logger;
  summaries: ObservationStepSummary[];
  context: string;
}

export async function investigateEntity(
  parameters: EntityInvestigationParameters
): Promise<EntityInvestigation | undefined> {
  const {
    entity,
    inferenceClient,
    connectorId,
    summaries,
    start,
    end,
    esClient,
    logSources,
    logger: parentLogger,
    context,
  } = parameters;
  const kuery = getEntityKuery(entity);

  const logger = parentLogger.get('investigateEntity');

  logger.debug(() => `Investigating entity: ${JSON.stringify(parameters.entity)}`);

  const [{ dataStreams }, alerts, slos] = await getSignals({ ...parameters, kuery });

  logger.debug(
    () =>
      `Signals for entity ${JSON.stringify(entity)}: ${dataStreams.length} data streams, ${
        alerts.length
      } alerts, ${slos.length} slos`
  );

  if (!dataStreams.length) {
    return undefined;
  }

  const allAnalysis = await analyzeDataStreamsForEntity({ ...parameters, kuery, dataStreams });

  const { ownPatterns, patternsFromOtherEntities } = await analyzeLogPatterns({
    ...parameters,
    allAnalysis,
    entity,
    index: dataStreams,
    system: stringifySummaries(summaries),
  });

  const dataToAnalyzePrompt = `## Document analysis
    ${JSON.stringify(allAnalysis)}

    ## Log patterns from entity

    ${serializePatterns(ownPatterns)}

    ## SLOs
    ${slos.length ? `${JSON.stringify(slos)}` : 'No SLOs'}

    ## Alerts
    ${alerts.length ? `${JSON.stringify(alerts)}` : 'No active alerts'}
    
    ### Possibly relevant log patterns from other entities

    ${serializePatterns(patternsFromOtherEntities, Object.keys(entity))}
    `;

  const [{ content: relatedEntitiesSummary, values, foundEntities }, summary] = await Promise.all([
    findRelatedEntities({
      connectorId,
      dataToAnalyzePrompt,
      end,
      entity,
      esClient,
      index: logSources,
      inferenceClient,
      logger,
      start,
      context,
    }),
    generateEntityReport(),
  ]);

  const previouslyInvestigatedEntities = summaries.flatMap((prevSummary) =>
    prevSummary.investigations.map(({ entity: investigatedEntity }) => investigatedEntity)
  );

  const { relationships } = await getEntityRelationships({
    summary,
    relatedEntitiesSummary,
    inferenceClient,
    previouslyInvestigatedEntities,
    connectorId,
    entity,
    foundEntities,
  });

  return {
    entity,
    summary,
    relationships,
    attachments: {
      alerts,
      slos,
      allAnalysis,
      ownPatterns,
      patternsFromOtherEntities,
      searchValues: values,
    },
  };

  async function generateEntityReport() {
    const system = SYSTEM_PROMPT;

    const input = getInputPrompt({
      entity,
      summaries,
      dataToAnalyzePrompt,
    });

    const { content: healthStatusSummary } = await lastValueFrom(
      inferenceClient
        .output('summarize_health_status', {
          connectorId,
          system,
          input,
        })
        .pipe(withoutOutputUpdateEvents())
    );

    return healthStatusSummary;
  }
}

async function getSignals({
  entity,
  rulesClient,
  alertsClient,
  start,
  end,
  sloSummaryIndices,
  spaceId,
  logSources,
  kuery,
  esClient,
}: Omit<EntityInvestigationParameters, 'serviceName' | 'connectorId' | 'inferenceClient'> & {
  kuery: string;
  entity: Record<string, unknown>;
}) {
  return await Promise.all([
    getDataStreamsForEntity({
      esClient,
      kuery,
      index: logSources,
    }),
    getAlertsForEntity({ entity, rulesClient, alertsClient, start, end, size: 10 }).then(
      (alertsResponse) => {
        return alertsResponse.hits.hits.map((hit) => hit._source!);
      }
    ),
    getSlosForEntity({
      entity,
      start,
      end,
      esClient,
      size: 1000,
      sloSummaryIndices,
      spaceId,
    }).then((slosResponse) => {
      return slosResponse.hits.hits.map((hit) => hit._source);
    }),
  ]);
}

async function analyzeDataStreamsForEntity({
  start,
  end,
  logSources,
  dataStreams,
  esClient,
  kuery,
}: {
  start: number;
  end: number;
  kuery: string;
  logSources: string[];
  dataStreams: string[];
  esClient: ObservabilityElasticsearchClient;
}) {
  const limiter = pLimit(5);

  return await Promise.all(
    dataStreams.map((dataStream) => {
      return limiter(async () => {
        const analysis = await analyzeDocuments({
          esClient,
          start,
          end,
          index: logSources,
          kuery,
        });
        return {
          dataStream,
          analysis: sortAndTruncateAnalyzedFields({
            ...analysis,
            fields: analysis.fields.filter((field) => !field.empty),
          }),
        };
      });
    })
  );
}
