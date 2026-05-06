/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from './es_schemas/ui/fields/agent';
import type { EventOutcome } from './es_schemas/raw/fields/event_outcome';
import type { StatusCode } from './es_schemas/raw/fields/otel/status_code';
import { EVENT_OUTCOME, STATUS_CODE } from './es_fields/apm';
import type { Span } from './es_schemas/ui/span';
import type { Transaction } from './es_schemas/ui/transaction';

const STATUS_FIELD_NAME = [EVENT_OUTCOME, STATUS_CODE] as const;

export type CompressionStrategy = 'exact_match' | 'same_kind';

export interface TraceItemComposite {
  count: number;
  sum: number;
  compressionStrategy: CompressionStrategy;
}

export type TraceItemDocType = 'span' | 'transaction';

export interface TraceItem {
  id: string;
  timestampUs: number;
  name: string;
  traceId: string;
  duration: number;
  result?: string;
  errors: Array<{ errorDocId: string; errorDocIndex?: string }>;
  status?: {
    fieldName: (typeof STATUS_FIELD_NAME)[number];
    value: EventOutcome | StatusCode;
  };
  parentId?: string;
  serviceName: string;
  serviceEnvironment?: string;
  type?: string;
  sync?: boolean;
  agentName?: AgentName;
  spanLinksCount: {
    incoming: number;
    outgoing: number;
  };
  icon?: string;
  coldstart?: boolean;
  composite?: TraceItemComposite;
  docType: TraceItemDocType;
}

export interface TraceItemChild {
  traceDoc: TraceItem;
  children?: TraceItemChild[];
}

export interface FocusedTraceItems {
  rootDoc: TraceItem;
  parentDoc?: TraceItem;
  focusedTraceDoc: TraceItem;
  focusedTraceTree: TraceItemChild[];
}

export interface TransactionDetailRedirectInfo {
  '@timestamp': string;
  trace: {
    id: string;
  };
  transaction: {
    id: string;
    type: string;
    name: string;
    duration: {
      us: number;
    };
  };
  service: {
    name: string;
  };
}

export interface TraceRootSpan {
  duration: number;
}

export interface UnifiedSpanDocument
  extends Omit<Span, 'transaction'>,
    Pick<Transaction, 'transaction'> {
  _id: string;
  _index: string;
  duration?: number[] | string; // OTel duration
}
