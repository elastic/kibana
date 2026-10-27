/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveQuery } from '../../model/adaptive_query';

import type { DiagnosticBag } from './diagnostics';
import type { LensState } from './types';

export interface SynthesisInput {
  state: LensState;
  diagnostics: DiagnosticBag;
  preferredLayerId?: string;
  indexPatternId?: string;
  indexPatternTitle?: string;
  timeFieldName?: string;
  timeRange?: { from: string; to: string };
}

export interface ResolvedTimeWindow {
  fromEsql: string;
  toEsql: string;
  durationEsql?: string;
}

export interface SynthesisOutput {
  query: AdaptiveQuery;
  resolvedLayerId: string;
}
