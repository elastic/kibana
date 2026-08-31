/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
