/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRule, Message } from '@kbn/inference-common';

export const PII_TOKENIZATION_CAPABILITY_ID = 'inference.pii_tokenization';
export const INFERENCE_PROCEED_CAPABILITY_ID = 'inference.proceed';

export interface PiiTextRecord {
  readonly id: string;
  readonly text: string;
}

export interface DetectedPiiEntity {
  readonly recordId: string;
  readonly start: number;
  readonly end: number;
  readonly value: string;
  readonly entityClass: string;
}

export interface PiiTokenizationContext {
  detectEntities(options: {
    records: readonly PiiTextRecord[];
    rules: readonly AnonymizationRule[];
    abortSignal?: AbortSignal;
  }): Promise<readonly DetectedPiiEntity[]>;

  tokenize(entityClass: string, value: string): string;
}

export interface InferenceTokenMapEntry {
  readonly original: string;
  readonly entityClass: string;
}

export interface InferenceProceedInput {
  readonly system?: string;
  readonly messages: readonly Message[];
  readonly tokenMap: Readonly<Record<string, InferenceTokenMapEntry>>;
  readonly abortSignal?: AbortSignal;
}

export interface InferenceProceedCapability {
  invoke(input: InferenceProceedInput): Promise<{ rawContent: string }>;
}
