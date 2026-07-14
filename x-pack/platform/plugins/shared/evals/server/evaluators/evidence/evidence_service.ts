/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TraceAccessorWithSearch, type TraceFilter } from '../trace_accessor';
import { EVIDENCE_MAPPING_PROFILES } from './profiles';
import { getEvidenceMapping } from './resolve_mapping';
import type {
  EvidenceItemKey,
  EvidenceMapping,
  EvidenceMessageItemSpec,
  EvidenceRound,
  EvidenceToolCallsItemSpec,
  ToolCallEvidence,
} from './types';

const MAX_EVIDENCE_DOCS = 200;
const MESSAGE_CANDIDATE_LIMIT = 20;
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

export const hasTraceDocuments = async (
  traceAccessor: TraceAccessorWithSearch
): Promise<boolean> => {
  const [logs, traces] = await Promise.all([
    traceAccessor.runSearch('logs', {
      fields: ['@timestamp'],
      size: 1,
      sort: { field: '@timestamp', order: 'desc' },
    }),
    traceAccessor.runSearch('traces', {
      fields: ['@timestamp'],
      size: 1,
      sort: { field: '@timestamp', order: 'desc' },
    }),
  ]);

  return logs.documents.length > 0 || traces.documents.length > 0;
};

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

const toTraceFilters = (spec: EvidenceMessageItemSpec | EvidenceToolCallsItemSpec): TraceFilter[] =>
  spec.filter.map(({ field, value }) => ({
    type: 'term',
    field,
    value,
  }));

const getMessageSearchParams = (
  spec: EvidenceMessageItemSpec
): {
  filter: TraceFilter[];
  fields: string[];
  sort: { field: string; order: 'asc' | 'desc' };
  size: number;
} => ({
  // Do not add an `exists` filter on contentField: long values under `flattened`
  // mappings (e.g. body.structured) are omitted from the index past ignore_above
  // but remain available in `_source`.
  filter: toTraceFilters(spec),
  fields: ['@timestamp', spec.contentField],
  sort: {
    field: '@timestamp',
    order: spec.select === 'last' ? 'desc' : 'asc',
  },
  size: MESSAGE_CANDIDATE_LIMIT,
});

const getToolCallsSearchParams = (
  spec: EvidenceToolCallsItemSpec
): {
  filter: TraceFilter[];
  fields: string[];
  sort: { field: string; order: 'asc' | 'desc' };
  size: number;
} => {
  const { tool_call_id, tool_id, arguments: toolArguments, result } = spec.fields;
  return {
    filter: toTraceFilters(spec),
    fields: ['@timestamp', tool_call_id, tool_id, toolArguments, result],
    sort: {
      field: '@timestamp',
      order: 'asc',
    },
    size: MAX_EVIDENCE_DOCS,
  };
};

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

const parseMessageFromDocument = (
  itemKey: 'user_query' | 'agent_response',
  itemSpec: EvidenceMessageItemSpec,
  document: Record<string, unknown>
): string | undefined => {
  if (itemSpec.parse === 'string') {
    return firstStringValue(getFieldValue(document, itemSpec.contentField));
  }

  const messages = toMessageArray(getFieldValue(document, itemSpec.contentField));
  const role = itemKey === 'agent_response' ? 'assistant' : 'user';
  return getGenAiMessageText(messages, role);
};

const parseMessageValue = (
  itemKey: 'user_query' | 'agent_response',
  itemSpec: EvidenceMessageItemSpec,
  documents: Array<Record<string, unknown>>
): string | undefined => {
  for (const document of documents) {
    const value = parseMessageFromDocument(itemKey, itemSpec, document);
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
};

const parseToolCallsValue = (
  itemSpec: EvidenceToolCallsItemSpec,
  documents: Array<Record<string, unknown>>
): ToolCallEvidence[] | undefined => {
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
  accessor: TraceAccessorWithSearch,
  itemKey: EvidenceItemKey,
  itemSpec: EvidenceMessageItemSpec | EvidenceToolCallsItemSpec
): Promise<EvidenceItemProbeResult> => {
  const isToolCallsItem = itemKey === 'tool_calls';
  const searchParams = isToolCallsItem
    ? getToolCallsSearchParams(itemSpec as EvidenceToolCallsItemSpec)
    : getMessageSearchParams(itemSpec as EvidenceMessageItemSpec);
  const { documents } = await accessor.runSearch(itemSpec.source, searchParams);
  const firstFieldPath = isToolCallsItem
    ? (itemSpec as EvidenceToolCallsItemSpec).fields.tool_call_id
    : (itemSpec as EvidenceMessageItemSpec).contentField;

  if (documents.length === 0) {
    return { status: 'not_found', field: firstFieldPath };
  }

  const parsedValue = isToolCallsItem
    ? parseToolCallsValue(itemSpec as EvidenceToolCallsItemSpec, documents)
    : parseMessageValue(
        itemKey as 'user_query' | 'agent_response',
        itemSpec as EvidenceMessageItemSpec,
        documents
      );
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
  traceAccessor: TraceAccessorWithSearch,
  mapping: EvidenceMapping
): Promise<EvidenceRound> => {
  const [userSearch, agentSearch, toolSearch] = await Promise.all([
    traceAccessor.runSearch(mapping.user_query.source, getMessageSearchParams(mapping.user_query)),
    traceAccessor.runSearch(
      mapping.agent_response.source,
      getMessageSearchParams(mapping.agent_response)
    ),
    traceAccessor.runSearch(
      mapping.tool_calls.source,
      getToolCallsSearchParams(mapping.tool_calls)
    ),
  ]);

  const userMessage = parseMessageValue('user_query', mapping.user_query, userSearch.documents);
  const agentMessage = parseMessageValue(
    'agent_response',
    mapping.agent_response,
    agentSearch.documents
  );
  const toolCalls = parseToolCallsValue(mapping.tool_calls, toolSearch.documents);

  return {
    input: { message: typeof userMessage === 'string' ? userMessage : '' },
    response: { message: typeof agentMessage === 'string' ? agentMessage : '' },
    steps: Array.isArray(toolCalls) ? toolCalls : [],
  };
};

export const probeProfiles = async (
  traceAccessor: TraceAccessorWithSearch
): Promise<EvidenceProfileProbeResult[]> => {
  const profileNames = Object.keys(EVIDENCE_MAPPING_PROFILES) as Array<
    keyof typeof EVIDENCE_MAPPING_PROFILES
  >;
  const profileResults = await Promise.all(
    profileNames.map(async (profile): Promise<EvidenceProfileProbeResult> => {
      const mapping = getEvidenceMapping(profile);
      const [userQueryProbe, agentResponseProbe, toolCallsProbe] = await Promise.all([
        probeItem(traceAccessor, 'user_query', mapping.user_query),
        probeItem(traceAccessor, 'agent_response', mapping.agent_response),
        probeItem(traceAccessor, 'tool_calls', mapping.tool_calls),
      ]);

      return {
        profile,
        evidence: {
          user_query: userQueryProbe,
          agent_response: agentResponseProbe,
          tool_calls: toolCallsProbe,
        },
      };
    })
  );

  return profileResults;
};
