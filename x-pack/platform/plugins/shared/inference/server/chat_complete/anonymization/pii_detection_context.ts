/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRule } from '@kbn/inference-common';

export interface PiiTextRecord {
  id: string;
  text: string;
}

export interface DetectedPiiEntity {
  recordId: string;
  start: number;
  end: number;
  value: string;
  entityClass: string;
}

export interface PiiDetectionContext {
  detectEntities(options: {
    records: readonly PiiTextRecord[];
    rules: readonly AnonymizationRule[];
    abortSignal?: AbortSignal;
  }): Promise<readonly DetectedPiiEntity[]>;
}
