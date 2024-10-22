/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '@kbn/alerting-plugin/server';
import { InferenceClient, withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import { getEntityKuery } from '@kbn/observability-utils-common/entities/get_entity_kuery';
import { sortAndTruncateAnalyzedFields } from '@kbn/observability-utils-common/llm/log_analysis/sort_and_truncate_analyzed_fields';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import pLimit from 'p-limit';
import { lastValueFrom } from 'rxjs';
import { highlightPatternFromRegex } from '@kbn/observability-utils-common/llm/log_analysis/highlight_patterns_from_regex';
import { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { analyzeDocuments } from '../../entities/analyze_documents';
import { getDataStreamsForEntity } from '../../entities/get_data_streams_for_entity';
import { getAlertsForEntity } from '../../entities/signals/get_alerts_for_entity';
import { getSlosForEntity } from '../../entities/signals/get_slos_for_entity';
import { ObservabilityElasticsearchClient } from '../../es/client/create_observability_es_client';
import { AnalyzeLogPatternOutput, analyzeLogPatterns } from '../analyze_log_patterns';
import { RCA_SYSTEM_PROMPT_BASE, RCA_TIMELINE_GUIDE } from './system_prompt_base';

const SYSTEM_PROMPT_ADDENDUM = `# Guide: Investigating an Entity
Based on Hypothesis and Context

When tasked with investigating an entity, the focus is on
understanding its role within the system, verifying assumptions
from given hypotheses, and identifying symptoms that support or
contradict those assumptions. The investigation includes analyzing
open alerts, service-level objectives (SLOs), and log patterns
with change point detection.

The steps below outline how to conduct a structured investigation
of an entity and present findings that can guide a lead SRE in
making decisions.

---

## 1. Understanding the Context and Hypothesis

The first step is to focus on the **context** provided for the
investigation. This might include:
- A specific reason for the investigation (e.g., elevated error rates).
- A hypothesis (e.g., resource exhaustion or upstream service failures).
- Open alerts, degraded SLOs, and notable log patterns.

Keep this context front and center throughout the investigation,
as it will inform what evidence you’re looking for.

---

## 2. Entity Overview

Next, describe the entity itself in terms of its infrastructure,
environment, and characteristics:
- **Infrastructure and Environment:** 
  - Which cloud provider or data center is it running on?
  - What kind of hardware, network, or virtualized infrastructure
  is being used?
- **Communication Protocols and Language:**
  - Does it use HTTP, gRPC, or other protocols to communicate with
  other services?
  - What programming language or framework does it rely on?
- **Deployment Details:**
  - Is it part of a containerized deployment, like Kubernetes, or a VM?
  - Are there any relevant environment variables or configuration
  parameters?

### Example:
- **Entity:** \`myservice\`
- **Environment:** Kubernetes pod, running in \`production\`
- **Language:** Java 11, Spring Boot
- **Communication:** HTTP and gRPC
- **Cloud Provider:** Google Cloud Platform, \`us-central1\`

---

## 3. Identifying Related Entities

Investigate the relationships this entity has with other components:
- **Upstream Dependencies:** Services or databases that feed data
or resources into the entity.
- **Downstream Dependencies:** Services that consume outputs or
data from the entity.
- **Infrastructure:** The systems that this entity runs on (e.g.,
cloud infrastructure, databases).
  
For each related entity:
- Describe the relationship (e.g., "upstream service", "downstream
consumer", "runs-on").
- Present evidence of the relationship from log patterns, SLO
breaches, or data (e.g., API calls, network traffic).

### Example:
- **Related Entity 1:** \`auth-service\` (upstream service)
  - **Evidence:** Log entries show frequent API calls to \`auth-service\`
  for user authentication.
- **Related Entity 2:** \`notification-service\` (downstream consumer)
  - **Evidence:** \`notification-service\` logs frequent HTTP requests
  to \`/api/send\`.
- **Related Entity 3:** \`myservice-964f644b5-4g7jk\` (pod)
  - **Evidence:** \`myservice\` logs contain references to
  \`myservice-964f644b5-4g7jk\`.

---

## 4. Health Status Assessment

Using the provided alerts, SLOs, and log patterns, evaluate the overall
health of the entity. Consider:
- **Active Alerts:** List and describe the significance of any open alerts.
  - Are they service-specific (e.g., high CPU usage, memory pressure)?
  - Are they performance-related (e.g., latency, request failures)?
- **SLO Performance:** Are any SLOs being violated (e.g., error rates,
response time)?
- **Log Patterns and Anomalies:** Include log entries or patterns that
show abnormal behavior (e.g., increase in error logs or change points
that coincide with the issues). For change points, take their
significance into account - highly significant change points could
be more relevant than others.

### Example:
- **Alerts:**
  - High memory usage on \`myservice\` (Alert: \`memory_usage_above_90%\`)
  - Elevated error rate on \`/api/submit\` (Alert: \`error_rate_above_threshold\`)
- **SLO Violations:**
  - SLO for error rate on \`/api/submit\` breached (SLO: \`99% success rate\`).
- **Log Patterns:**
  - Sudden increase in \`NullPointerException\` in logs for \`/api/submit\` endpoint.

---

## 5. Relevance of Entity to the Investigation

Based on the context provided (e.g., elevated failure rate on \`/api/submit\`),
describe how the characteristics and current health status of the entity
relate to the ongoing investigation:
- **Is the entity showing signs that align with the hypothesis?**
  - For example, if the hypothesis is resource exhaustion, confirm if memory,
  CPU, or connection pool exhaustion is observed.
- **Do the relationships with upstream or downstream entities reveal additional
clues?**
  - If the entity depends on an upstream service, verify whether that service
  is healthy or facing issues that propagate downstream.

### Example:
- **Relevance:** \`myservice\` is crucial to the ongoing investigation because
the elevated error rate at \`/api/submit\` directly affects SLOs. High memory
usage and errors suggest the hypothesis of resource exhaustion may be valid.

---

## 6. Timeline of Significant Events

${RCA_TIMELINE_GUIDE}

---

## 7. Next Steps or Root Cause Identification

Based on the findings, suggest the next steps in the investigation or, if
possible, identify a root cause:
- **Next Steps:** Suggest further log analysis, or examining related entities
or significant events more closely. 
- **Root Cause:** If the evidence strongly points to a specific issue, describe
the root cause (e.g., "High memory usage is causing service crashes, leading
to elevated errors at \`/api/submit\`").

### Example:
- **Next Steps:** Investigate upstream service \`auth-service\` to ensure
it’s not slowing down authentication requests.
- **Potential Root Cause:** Memory exhaustion in \`myservice\` leading to
cascading failures for requests to \`/api/submit\`.
`;

export interface EntityHealthAnalysis {
  entity: Record<string, string>;
  summary: string;
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
    context: string;
  } & AnalyzeLogPatternOutput;
}

export interface EntityHealthAnalysisParameters {
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
  context: string;
  entity: Record<string, string>;
}

export async function analyzeEntityHealth(
  parameters: EntityHealthAnalysisParameters
): Promise<EntityHealthAnalysis | undefined> {
  const { entity, inferenceClient, connectorId, context } = parameters;
  const kuery = getEntityKuery(entity);

  const [{ dataStreams }, alerts, slos] = await getSignals({ ...parameters, kuery });

  if (!dataStreams.length) {
    return undefined;
  }

  const allAnalysis = await analyzeDataStreamsForEntity({ ...parameters, kuery, dataStreams });

  const { ownPatternCategories, relevantPatternsFromOtherEntities } = await analyzeLogPatterns({
    ...parameters,
    allAnalysis,
    entity,
    index: dataStreams,
    context,
  });

  const dataToAnalyzePrompt = `## Document analysis
    ${JSON.stringify(allAnalysis)}

    ## Log patterns from entity

    ${ownPatternCategories
      .map(({ label, patterns }) => {
        return `### \`${label}
        
      ${patterns
        .map(
          (pattern) =>
            `- ${JSON.stringify({
              sample: highlightPatternFromRegex(pattern.regex, pattern.sample),
              lastSeen: pattern.lastOccurrence,
              change: pattern.change,
              count: pattern.count,
            })}`
        )
        .join('\n')}`;
      })
      .join('\n\n')}

    ## SLOs
    ${slos.length ? `${JSON.stringify(slos)}` : 'No SLOs'}

    ## Alerts
    ${alerts.length ? `${JSON.stringify(alerts)}` : 'No active alerts'}
    
    ### Possibly relevant log patterns from other entities

    ${relevantPatternsFromOtherEntities.map((pattern) => {
      return `- ${JSON.stringify({
        sample: highlightPatternFromRegex(pattern.regex, pattern.sample),
        lastSeen: pattern.lastOccurrence,
        change: pattern.change,
        count: pattern.count,
        metadata: pattern.metadata,
      })}`;
    })}
    `;

  const { content: healthStatusSummary } = await lastValueFrom(
    inferenceClient
      .output('summarize_health_status', {
        connectorId,
        system: `${RCA_SYSTEM_PROMPT_BASE}
        
        ${SYSTEM_PROMPT_ADDENDUM}`,
        input: `Analyze the following entity.
        
        ${
          context
            ? `## Context

            ${context}`
            : ``
        }
    
          ${dataToAnalyzePrompt}`,
      })
      .pipe(withoutOutputUpdateEvents())
  );

  return {
    entity,
    summary: healthStatusSummary,
    attachments: {
      alerts,
      slos,
      context,
      allAnalysis,
      ownPatternCategories,
      relevantPatternsFromOtherEntities,
    },
  };
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
}: Omit<EntityHealthAnalysisParameters, 'serviceName' | 'connectorId' | 'inferenceClient'> & {
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
