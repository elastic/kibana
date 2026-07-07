/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import type { PreservedTimeUnit, TimeUnit } from '../../shared';

export type { PreservedTimeUnit, TimeUnit };

export interface DslStepMetaFields {
  afterValue: string;
  afterUnit: PreservedTimeUnit;
  /**
   * Derived field used for cross-step `after` ordering validation.
   * -1 means "unset / invalid / not computed".
   */
  afterToMilliSeconds: number;
  fixedIntervalValue: string;
  fixedIntervalUnit: PreservedTimeUnit;
}

/**
 * All UI controls write to dedicated form paths under `_meta.*`.
 * Output `IngestStreamLifecycleDSL` is constructed solely by the serializer.
 */
export interface DslStepsFlyoutFormInternal {
  _meta: {
    downsampleSteps: DslStepMetaFields[];
  };
}

/**
 * Output/serialized shape for consumers.
 * This matches the existing component contract: `onChange(next: IngestStreamLifecycleDSL)`.
 */
export type DslStepsFlyoutFormOutput = IngestStreamLifecycleDSL;
