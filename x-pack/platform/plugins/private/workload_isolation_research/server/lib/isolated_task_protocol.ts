/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OffenderParams, OffenderResult } from './offenders';

export type IsolatedTaskClass = 'offender' | 'field_caps';

export interface OffenderRequest {
  readonly module: 'offender';
  readonly params: OffenderParams;
}

export interface FieldCapsRequest {
  readonly module: 'field_caps';
  readonly bytes: ArrayBuffer;
  readonly pattern: string;
}

export interface FieldCapsShapeResult {
  readonly fields: number;
  readonly field_digest: string;
  readonly decode_ms: number;
  readonly parse_ms: number;
  readonly shape_ms: number;
  readonly heap_delta_mb: number;
}

export interface OffenderResponse {
  readonly module: 'offender';
  readonly result: OffenderResult;
  readonly threadId: number;
  readonly heapUsed: number;
}

export interface FieldCapsResponse {
  readonly module: 'field_caps';
  readonly result: FieldCapsShapeResult;
  readonly threadId: number;
  readonly heapUsed: number;
}

export type IsolatedTaskRequest = OffenderRequest | FieldCapsRequest;
export type IsolatedTaskResult = OffenderResponse | FieldCapsResponse;
