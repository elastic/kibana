/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformStreamsSigEventsTools } from '@kbn/agent-builder-common';

export const createRcaSkill = () =>
  defineSkillType({
    id: 'observability.rca',
    name: 'rca',
    basePath: 'skills/observability',
    description:
      'Investigates incidents and service degradations by analyzing Knowledge Indicators ' +
      '(features and detection queries) derived from streams data. Use when the user wants to ' +
      'find the root cause of an issue affecting a specific stream or service.',
    content: buildRcaSkillContent(),
    getRegistryTools: () => [platformStreamsSigEventsTools.searchKnowledgeIndicators],
  });

function buildRcaSkillContent(): string {
  return dedent(`
    ## When to Use This Skill

    Use this skill when:
    - A user asks "why is X failing / slow / erroring?" about a stream or service
    - A user mentions an active incident and asks for the root cause
    - A user wants to understand patterns or anomalies present in a stream
    - A user asks "what is happening in stream X?"

    ## Standard Operating Procedure

    You MUST follow this procedure in order.

    ### Phase 1: Identify the Target Stream

    - If the user mentions a specific stream or service name, use it directly as \`stream_names\`.
    - If the stream is unknown, call \`search_knowledge_indicators\` with no \`stream_names\` filter
      to discover what streams have data, then ask the user to confirm the relevant one(s).

    ### Phase 2: Load All Knowledge Indicators

    Call \`search_knowledge_indicators\` with:
    - \`stream_names\`: the target stream(s) identified in Phase 1
    - \`limit\`: 50 (to get a complete picture)
    - Omit \`kind\` (default fetches both features and queries)

    If the user described a symptom (e.g. "OOM errors", "connection timeouts"), also call with
    \`search_text\` matching that symptom to surface semantically relevant KIs.

    ### Phase 3: Analyze Feature Indicators

    Feature KIs encode behavioral patterns identified from the stream's data. Evaluate them by type:

    - **\`error_logs\`**: Direct error signatures — the strongest signal for root cause.
      High \`confidence\` (> 70) means the feature was observed frequently and reliably.
      Read \`description\`, \`properties\`, and \`evidence\` to understand what errors are present.

    - **\`log_patterns\`**: Recurring message templates. Check whether any pattern matches the
      reported symptom. Examine the \`filter\` field — it tells you which subset of data
      (e.g. a specific service or log level) the pattern applies to.

    - **\`dataset_analysis\`**: Broad statistics about the stream (volume, field cardinality).
      Use this to establish the baseline before looking for anomalies.

    - **\`log_samples\`**: Representative raw log documents. Useful for understanding data shape
      and spotting unexpected fields or values.

    Sort features by \`confidence\` descending — higher-confidence features are more reliable evidence.

    ### Phase 4: Analyze Query Indicators

    Query KIs represent detection logic that operators have explicitly defined for this stream.

    - **\`backed: true\`**: The query has a backing Kibana alert rule — it is actively monitored
      in production. Treat these as high-signal evidence.
    - **\`severity_score > 70\`**: Critical detections. Prioritize these.
    - Read \`description\` for a human-readable summary of what the query detects.
    - Read \`esql\` to understand the exact detection condition.
    - \`evidence\` provides supporting facts that explain why this query was created.

    ### Phase 5: Cross-Correlate and Form a Hypothesis

    Look for convergence across KI types:
    - A high-confidence \`error_logs\` feature AND a backed query covering the same pattern
      = very strong evidence for that root cause.
    - Multiple features of different types (e.g. \`error_logs\` + \`log_patterns\`) pointing to the
      same component = convergence signal.
    - Feature \`filter\` conditions overlapping with query conditions = corroboration.

    Rank your hypotheses by the weight of converging evidence.

    ### Phase 6: Output Your Findings

    Always provide:
    - **Root cause** — or your top hypothesis if the evidence is not conclusive
    - **Supporting evidence** — specific feature IDs, confidence scores, query names, severity scores
    - **What to check next** — if the hypothesis needs confirmation, name the specific query to run
      or which log fields to inspect

    ## Critical Rules

    1. ALWAYS start with \`search_knowledge_indicators\` — never state a root cause without data.
    2. Do NOT retry a failed call with identical parameters. Try different \`stream_names\`,
       \`search_text\`, or \`kind\` to approach the problem from a different angle.
    3. If the tool returns no KIs, tell the user: the stream likely does not have enough historical
       data for feature identification yet, and suggest checking back after more data has been ingested.
    4. Do NOT fabricate confidence scores, feature IDs, or query names — only report what the tool
       actually returned.
  `);
}
