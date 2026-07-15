/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAMS_RULE_CONSUMER = 'streams' as const;
export const STREAMS_ESQL_RULE_TYPE_ID = 'streams.rules.esql' as const;
export const STREAMS_RULE_STREAM_TAG_PREFIX = 'sigevents:stream:' as const;

export const toStreamTag = (streamName: string): string =>
  `${STREAMS_RULE_STREAM_TAG_PREFIX}${streamName}`;

/**
 * Narrow interface that decouples QueryClient from the Alerting v2 client.
 */
export interface IRulesManagementClient {
  /** Idempotent create: implementations should handle 409 by updating in place. */
  createRule(id: string, body: CreateRuleBody): Promise<void>;

  /** Non-breaking patch: implementations should handle 404 by creating instead. */
  updateRule(id: string, body: UpdateRuleBody): Promise<void>;

  /** Best-effort bulk delete: implementations should swallow 404/400 for missing rules. */
  bulkDeleteRules(ids: string[]): Promise<void>;

  findOwnedRuleIds(streamName: string): Promise<string[]>;
}

/** Rule creation payload translated to the Alerting v2 API by the adapter. */
export interface CreateRuleBody {
  name: string;
  consumer: string;
  alertTypeId: string;
  /** SigEvents rules never have actions — typed as never[] to enforce at compile time. */
  actions: never[];
  params: {
    timestampField: string;
    query: string;
  };
  enabled: boolean;
  tags: string[];
  schedule: {
    interval: string;
  };
}

/** Rule update payload translated to the Alerting v2 API by the adapter. */
export interface UpdateRuleBody {
  name: string;
  /** SigEvents rules never have actions — typed as never[] to enforce at compile time. */
  actions: never[];
  params: {
    timestampField: string;
    query: string;
  };
  tags: string[];
  schedule: {
    interval: string;
  };
}
