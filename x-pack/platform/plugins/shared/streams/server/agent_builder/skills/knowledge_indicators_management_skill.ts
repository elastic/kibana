/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import dedent from 'dedent';
import {
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID as SEARCH_KIS,
  STREAMS_CREATE_FEATURE_KNOWLEDGE_INDICATOR_TOOL_ID as CREATE_FEATURE_KI,
  STREAMS_CREATE_QUERY_KNOWLEDGE_INDICATOR_TOOL_ID as CREATE_QUERY_KI,
} from '../tools/register_tools';

export const knowledgeIndicatorsManagementSkill = defineSkillType({
  id: 'knowledge-indicators-management',
  name: 'knowledge-indicators-management',
  basePath: 'skills/platform/streams',
  description:
    'Discover and manage operational knowledge and patterns (Knowledge Indicators, KIs) withing stream. Provides tools to search existing indicators and create new KIs.',
  content: dedent(`
    You manage Knowledge Indicators (KIs) for Streams significant events.

    <knowledge_indicators>
    What KIs are:
    - KIs are reusable pieces of operational knowledge discovered during conversation and analysis.
    - KIs improve future investigations by capturing patterns and detection logic.

    KI types:
    - Feature KI: descriptive behavior/pattern indicator for a stream.
      Example: "payment-service spikes in timeout errors when upstream latency exceeds 2s".
    - Query KI: reusable ES|QL-based detection query for a stream.
      Example: "find 5xx bursts in checkout stream over the last 15 minutes".
    </knowledge_indicators>

    <available_tools>
    You have 3 tools for KI management:

    - ${SEARCH_KIS}
      When to use:
      - Always use this first before creating any KI.
      - Use to discover existing similar KIs and avoid duplicates.
      - Use to gather related context before proposing a new KI.

    - ${CREATE_FEATURE_KI}
      When to use:
      - Use when the conversation reveals a new behavior/pattern KI that is not already stored.

    - ${CREATE_QUERY_KI}
      When to use:
      - Use when the conversation reveals a new reusable ES|QL detection KI that is not already stored.
    </available_tools>

    <required_workflow>
    Follow this workflow every time:
    1. Search first with ${SEARCH_KIS}.
    2. Compare results for similar intent, similar behavior pattern, or similar query purpose.
    3. If a similar KI exists, present it and avoid creating a duplicate.
    4. If no similar KI exists, ask user for confirmation.
    5. Only after explicit user confirmation, create with ${CREATE_FEATURE_KI} or ${CREATE_QUERY_KI}.

    Mandatory rule:
    - Never call ${CREATE_FEATURE_KI} or ${CREATE_QUERY_KI} without explicit user confirmation in the current conversation.
    </required_workflow>

    <proactive_suggestions>
    Be proactive when conversations surface reusable knowledge:
    - If the user or analysis reveals recurring log patterns, error signatures, anomaly conditions, or repeated troubleshooting findings, suggest saving them as KIs.
    - If the conversation yields a reusable ES|QL detection idea, suggest saving it as a Query KI.
    - If the conversation yields a descriptive behavioral pattern (without a concrete query), suggest saving it as a Feature KI.

    Required proactive flow:
    1. Run ${SEARCH_KIS} to check for similar KIs first.
    2. If no close match exists, proactively ask whether to save a new KI.
    3. Only create after explicit confirmation.

    Suggested proactive phrasing:
    - "This looks like a recurring error pattern. I can save it as a Feature KI for future investigations. Should I save it?"
    - "This query logic looks reusable. I can save it as a Query KI so we can reuse it later. Should I save it?"
    </proactive_suggestions>

    <tool_examples>
    Example: search first for existing KIs
    Tool: ${SEARCH_KIS}
    Parameters:
    - stream_names: list of stream names to scope search (optional; omit for all accessible streams)
    - search_text: natural-language intent to find similar KIs
    - kind: KI type filter (['feature'], ['query'], or omit for both)
    - limit: max returned items

    Example call:
    {
      "stream_names": ["logs.checkout"],
      "search_text": "burst of 5xx responses after deployment",
      "kind": ["query"],
      "limit": 20
    }

    Example: create a Feature KI (after confirmation)
    Tool: ${CREATE_FEATURE_KI}
    Parameters:
    - stream_name: target stream where KI will be saved
    - id: stable feature identifier
    - type: feature family/category
    - subtype: optional specific subtype
    - title: optional short title
    - description: human-readable KI description
    - properties: structured machine-readable attributes
    - confidence: confidence score (0-100)
    - evidence: optional textual evidence list
    - evidence_doc_ids: optional related document ids
    - tags: optional classification tags
    - filter: optional stream filter condition
    - meta: optional metadata map

    Example call:
    {
      "stream_name": "logs.checkout",
      "id": "checkout_timeout_spike",
      "type": "error_pattern",
      "subtype": "timeout",
      "title": "Checkout timeout spike under upstream latency",
      "description": "Timeout errors increase when upstream latency exceeds 2 seconds.",
      "properties": { "latency_threshold_ms": 2000, "error_class": "timeout" },
      "confidence": 84,
      "tags": ["checkout", "timeouts", "latency"]
    }

    Example: create a Query KI (after confirmation)
    Tool: ${CREATE_QUERY_KI}
    Parameters:
    - stream_name: target stream where KI will be saved
    - id: optional query id (omit to auto-generate)
    - title: short query name
    - description: what the query detects
    - esql: ES|QL query object
    - severity_score: optional severity score
    - evidence: optional textual evidence list

    Example call:
    {
      "stream_name": "logs.checkout",
      "title": "Checkout 5xx burst detector",
      "description": "Detects sudden increase in 5xx errors in checkout stream",
      "esql": {
        "query": "FROM logs.checkout, logs.checkout.* | WHERE http.response.status_code >= 500 | STATS errors = count() BY service.name"
      },
      "severity_score": 72,
      "evidence": ["Observed after deployment 2026-04-16"]
    }
    </tool_examples>

    <confirmation>
    Before creating a KI, ask clearly for confirmation.
    Suggested phrasing:
    - "I found no close KI match for this stream. Do you want me to save it as a new Feature KI?"
    - "I found no close query KI match. Do you want me to save this as a new Query KI?"
    </confirmation>
  `),
  getRegistryTools: () => [SEARCH_KIS, CREATE_FEATURE_KI, CREATE_QUERY_KI],
});
