/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTraceAccessor, type TraceFilter } from '../trace_accessor';
import type { TraceAccessor } from '../types';
import { EVIDENCE_MAPPING_PROFILES } from './profiles';
import { resolveEvidenceMapping } from './resolve_mapping';
import type {
  EvidenceItemKey,
  EvidenceItemSpec,
  EvidenceMapping,
  EvidenceRound,
  ToolCallEvidence,
} from './types';

const MAX_EVIDENCE_DOCS = 200;
const SAMPLE_LIMIT = 120;
const hasOwnProperty = (value: unknown, key: string): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);

type ProbeStatus = 'found' | 'not_found' | 'content_redacted';

export interface EvidenceItemProbeResult {
  status: ProbeStatus;
  field?: string;
  sample?: string;
}

export interface EvidenceProfileProbeResult {
  profile: string;
  evidence: Record<EvidenceItemKey, EvidenceItemProbeResult>;
}

const parseJsonIfPossible = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return value;
  }
};

const resolveFieldValue = (value: unknown, segments: string[]): unknown => {
  if (segments.length === 0) {
    return value;
  }

  // Trace/log documents store OTLP attributes as partially-flattened objects
  // with dotted keys (e.g. `{ attributes: { 'message.content': '...' } }`), and
  // may also be fully nested or fully flattened. Try the longest matching key
  // prefix first, then recurse into the remaining segments.
  for (let end = segments.length; end >= 1; end--) {
    const key = segments.slice(0, end).join('.');
    if (hasOwnProperty(value, key)) {
      const resolved = resolveFieldValue(value[key], segments.slice(end));
      if (resolved !== undefined) {
        return resolved;
      }
    }
  }

  return undefined;
};

const getFieldValue = (document: Record<string, unknown>, fieldPath: string): unknown =>
  resolveFieldValue(document, fieldPath.split('.'));

const toTraceFilters = (
  spec: EvidenceItemSpec,
  includeContentPresenceFilter: boolean
): TraceFilter[] => {
  const filters: TraceFilter[] = spec.filter.map(({ field, value }) => ({
    type: 'term',
    field,
    value,
  }));

  if (includeContentPresenceFilter && spec.parse === 'genai_messages') {
    const [messagesFieldPath] = Object.values(spec.fields);
    if (messagesFieldPath) {
      filters.push({ type: 'exists', field: messagesFieldPath });
    }
  }

  return filters;
};

const getSearchParams = (
  spec: EvidenceItemSpec,
  includeContentPresenceFilter: boolean
): {
  filter: TraceFilter[];
  fields: string[];
  sort: { field: string; order: 'asc' | 'desc' };
  size: number;
} => ({
  filter: toTraceFilters(spec, includeContentPresenceFilter),
  fields: ['@timestamp', ...Object.values(spec.fields)],
  sort: {
    field: '@timestamp',
    order: spec.select === 'last' ? 'desc' : 'asc',
  },
  size: spec.select === 'all' ? MAX_EVIDENCE_DOCS : 1,
});

const firstStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const toMessageArray = (rawValue: unknown): Array<Record<string, unknown>> => {
  const parsedValue = parseJsonIfPossible(rawValue);
  if (!Array.isArray(parsedValue)) {
    return [];
  }
  return parsedValue.filter(
    (entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object'
  );
};

const getGenAiMessageText = (
  messages: Array<Record<string, unknown>>,
  role: 'user' | 'assistant'
): string | undefined => {
  for (const message of messages) {
    if (message.role !== role) {
      continue;
    }

    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
      if (!part || typeof part !== 'object') {
        continue;
      }

      const content = (part as Record<string, unknown>).content;
      if (typeof content === 'string' && content) {
        return content;
      }
    }
  }

  return undefined;
};

const parseItemValue = (
  itemKey: EvidenceItemKey,
  itemSpec: EvidenceItemSpec,
  documents: Array<Record<string, unknown>>
): string | ToolCallEvidence[] | undefined => {
  if (itemSpec.parse === 'string') {
    const [fieldPath] = Object.values(itemSpec.fields);
    if (!fieldPath || documents.length === 0) {
      return undefined;
    }
    return firstStringValue(getFieldValue(documents[0], fieldPath));
  }

  if (itemSpec.parse === 'genai_messages') {
    const [fieldPath] = Object.values(itemSpec.fields);
    if (!fieldPath || documents.length === 0) {
      return undefined;
    }

    const messages = toMessageArray(getFieldValue(documents[0], fieldPath));
    const role = itemKey === 'agent_response' ? 'assistant' : 'user';
    return getGenAiMessageText(messages, role);
  }

  const entries = documents
    .map((document) => {
      const evidence: ToolCallEvidence = {};
      const toolCallId = getFieldValue(document, itemSpec.fields.tool_call_id);
      const toolId = getFieldValue(document, itemSpec.fields.tool_id);
      const toolArguments = getFieldValue(document, itemSpec.fields.arguments);
      const toolResult = getFieldValue(document, itemSpec.fields.result);

      if (typeof toolCallId === 'string' && toolCallId) {
        evidence.tool_call_id = toolCallId;
      }
      if (typeof toolId === 'string' && toolId) {
        evidence.tool_id = toolId;
      }

      const parsedArguments = parseJsonIfPossible(toolArguments);
      if (parsedArguments !== undefined) {
        evidence.arguments = parsedArguments;
      }

      const parsedResult = parseJsonIfPossible(toolResult);
      if (parsedResult !== undefined) {
        evidence.result = parsedResult;
      }

      if (
        evidence.tool_call_id === undefined &&
        evidence.tool_id === undefined &&
        evidence.arguments === undefined &&
        evidence.result === undefined
      ) {
        return undefined;
      }

      return evidence;
    })
    .flatMap((entry) => (entry ? [entry] : []));

  return entries.length > 0 ? entries : undefined;
};

const truncateSample = (sample: string): string =>
  sample.length > SAMPLE_LIMIT ? `${sample.slice(0, SAMPLE_LIMIT)}...` : sample;

const stringifySample = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

const probeItem = async (
  traceAccessor: TraceAccessor,
  itemKey: EvidenceItemKey,
  itemSpec: EvidenceItemSpec
): Promise<EvidenceItemProbeResult> => {
  const accessor = createTraceAccessor(traceAccessor);
  const searchParams = getSearchParams(itemSpec, true);
  const { documents } = await accessor.runSearch(itemSpec.source, searchParams);
  const [firstFieldPath] = Object.values(itemSpec.fields);

  if (documents.length === 0) {
    return { status: 'not_found', field: firstFieldPath };
  }

  const parsedValue = parseItemValue(itemKey, itemSpec, documents);
  const sample = stringifySample(parsedValue);
  if (!sample || !sample.trim()) {
    return { status: 'content_redacted', field: firstFieldPath };
  }

  return {
    status: 'found',
    field: firstFieldPath,
    sample: truncateSample(sample),
  };
};

export const normalizeEvidence = async (
  traceAccessor: TraceAccessor,
  mapping: EvidenceMapping
): Promise<EvidenceRound> => {
  const accessor = createTraceAccessor(traceAccessor);

  const [userSearch, agentSearch, toolSearch] = await Promise.all([
    accessor.runSearch(mapping.user_query.source, getSearchParams(mapping.user_query, true)),
    accessor.runSearch(
      mapping.agent_response.source,
      getSearchParams(mapping.agent_response, true)
    ),
    accessor.runSearch(mapping.tool_calls.source, getSearchParams(mapping.tool_calls, false)),
  ]);

  const userMessage = parseItemValue('user_query', mapping.user_query, userSearch.documents);
  const agentMessage = parseItemValue(
    'agent_response',
    mapping.agent_response,
    agentSearch.documents
  );
  const toolCalls = parseItemValue('tool_calls', mapping.tool_calls, toolSearch.documents);

  return {
    input: { message: typeof userMessage === 'string' ? userMessage : '' },
    response: { message: typeof agentMessage === 'string' ? agentMessage : '' },
    steps: Array.isArray(toolCalls) ? toolCalls : [],
  };
};

export const probeProfiles = async (
  traceAccessor: TraceAccessor
): Promise<EvidenceProfileProbeResult[]> => {
  const profileNames = Object.keys(EVIDENCE_MAPPING_PROFILES);
  const profileResults: EvidenceProfileProbeResult[] = [];

  for (const profile of profileNames) {
    const mapping = resolveEvidenceMapping({ profile });
    const [userQueryProbe, agentResponseProbe, toolCallsProbe] = await Promise.all([
      probeItem(traceAccessor, 'user_query', mapping.user_query),
      probeItem(traceAccessor, 'agent_response', mapping.agent_response),
      probeItem(traceAccessor, 'tool_calls', mapping.tool_calls),
    ]);

    profileResults.push({
      profile,
      evidence: {
        user_query: userQueryProbe,
        agent_response: agentResponseProbe,
        tool_calls: toolCallsProbe,
      },
    });
  }

  return profileResults;
};
