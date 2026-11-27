/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import openllmetryLangchainSpans from '../../evaluators/evidence/__fixtures__/openllmetry_langchain_spans.json';

export interface SearchRequest {
  index?: string | string[];
  query?: {
    bool?: {
      filter?: Array<Record<string, unknown>>;
    };
  };
}

interface SearchHit {
  _source: Record<string, unknown>;
}

interface SearchResponse {
  hits: {
    hits: SearchHit[];
  };
}

const emptySearchResponse: SearchResponse = { hits: { hits: [] } };

export const withHits = (documents: Array<Record<string, unknown>>): SearchResponse => ({
  hits: {
    hits: documents.map((document) => ({ _source: document })),
  },
});

export const getFilters = (request: SearchRequest): Array<Record<string, unknown>> =>
  request.query?.bool?.filter ?? [];

export const getFilterTraceId = (filters: Array<Record<string, unknown>>): string | undefined => {
  for (const filter of filters) {
    const termFilter = filter.term as Record<string, unknown> | undefined;
    if (!termFilter) {
      continue;
    }

    const traceFromLogs = termFilter.trace_id;
    if (typeof traceFromLogs === 'string') {
      return traceFromLogs;
    }

    const traceFromTraces = termFilter['trace.id'];
    if (typeof traceFromTraces === 'string') {
      return traceFromTraces;
    }
  }

  return undefined;
};

export const hasTermFilter = (
  filters: Array<Record<string, unknown>>,
  field: string,
  expectedValue: string
): boolean =>
  filters.some((filter) => {
    const termFilter = filter.term as Record<string, unknown> | undefined;
    return termFilter?.[field] === expectedValue;
  });

export const hasExistsFilter = (filters: Array<Record<string, unknown>>, field: string): boolean =>
  filters.some((filter) => {
    const existsFilter = filter.exists as Record<string, unknown> | undefined;
    return existsFilter?.field === field;
  });

export const buildClaudeCodeUserPromptDoc = ({
  timestamp,
  prompt,
}: {
  timestamp: string;
  prompt: string;
}): Record<string, unknown> => ({
  '@timestamp': timestamp,
  event_name: 'user_prompt',
  attributes: {
    prompt,
  },
});

export const buildClaudeCodeApiResponseDoc = ({
  timestamp,
  content,
}: {
  timestamp: string;
  content: unknown;
}): Record<string, unknown> => ({
  '@timestamp': timestamp,
  event_name: 'api_response_body',
  attributes: {
    body: JSON.stringify({
      role: 'assistant',
      content,
    }),
  },
});

export const buildClaudeCodeToolSpanDoc = ({
  timestamp,
  toolName,
  toolInput,
  newContext,
  toolUseId,
}: {
  timestamp: string;
  toolName: string;
  toolInput: string;
  newContext: string;
  toolUseId?: string;
}): Record<string, unknown> => ({
  '@timestamp': timestamp,
  name: 'claude_code.tool',
  attributes: {
    tool_name: toolName,
    tool_input: toolInput,
    new_context: newContext,
    ...(toolUseId ? { tool_use_id: toolUseId } : {}),
  },
});

/** Trace ids of the reference traces in the OpenLLMetry LangChain span fixture. */
export const OPENLLMETRY_LANGCHAIN_TRACE_IDS = {
  mcpTool: '4f6b7d3ea02accd61aa9b9b9a9f6856f',
  readFile: 'b88f334ff42c54a844c550781ae2e7fc',
  writeTodos: 'ac89be8f301f0b23458948c5a25844ae',
  subAgent: '7ca58eed31ee13a3edca24224573fb3b',
  raisedToolError: 'a0e0ea9764a1be74441cc5929e75e680',
  softMcpError: '1cb33a9488b122bc052cc094166ac2af',
} as const;

const OPENLLMETRY_LANGCHAIN_SPANS: ReadonlyArray<Record<string, unknown>> =
  openllmetryLangchainSpans;

/** Returns deep copies of the captured OpenLLMetry LangChain spans for one trace, in fixture order. */
export const getOpenllmetryLangchainSpans = (traceId: string): Array<Record<string, unknown>> =>
  OPENLLMETRY_LANGCHAIN_SPANS.filter((span) => span.trace_id === traceId).map((span) =>
    structuredClone(span)
  );

interface BuildSearchMockContext {
  index: string | undefined;
  filters: Array<Record<string, unknown>>;
  traceId: string | undefined;
  emptySearchResponse: SearchResponse;
}

export const buildSearchMock = (
  resolve: (context: BuildSearchMockContext) => SearchResponse | Promise<SearchResponse | undefined>
): jest.Mock<Promise<SearchResponse>, [SearchRequest]> =>
  jest.fn(async (request: SearchRequest) => {
    const index = Array.isArray(request.index) ? request.index[0] : request.index;
    const filters = getFilters(request);
    const traceId = getFilterTraceId(filters);

    const response = await resolve({
      index,
      filters,
      traceId,
      emptySearchResponse,
    });

    return response ?? emptySearchResponse;
  });

const TRACE_ID_FIELDS: ReadonlySet<string> = new Set(['trace.id', 'trace_id']);

const resolveSourceField = (source: unknown, path: string): unknown => {
  if (source === null || typeof source !== 'object') {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (path in record) {
    return record[path];
  }
  const segments = path.split('.');
  for (let index = 1; index < segments.length; index++) {
    const head = segments.slice(0, index).join('.');
    if (head in record) {
      return resolveSourceField(record[head], segments.slice(index).join('.'));
    }
  }
  return undefined;
};

/** Builds a search mock that applies each request's `term` filters to the given trace spans. */
export const buildSpanStoreSearchMock = (
  spans: ReadonlyArray<Record<string, unknown>>
): jest.Mock<Promise<SearchResponse>, [SearchRequest]> =>
  buildSearchMock(({ index, filters }) => {
    if (index !== 'traces-*') {
      return emptySearchResponse;
    }
    const terms = filters
      .flatMap((filter) => Object.entries((filter.term as Record<string, unknown>) ?? {}))
      .filter(([field]) => !TRACE_ID_FIELDS.has(field));
    return withHits(
      spans.filter((span) =>
        terms.every(([field, value]) => resolveSourceField(span, field) === value)
      )
    );
  });
