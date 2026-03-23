/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from './es_schemas/ui/span';
import type { Transaction } from './es_schemas/ui/transaction';

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
