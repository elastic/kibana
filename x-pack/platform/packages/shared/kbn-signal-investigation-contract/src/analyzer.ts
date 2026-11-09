/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import type { InvestigationSeed } from '@kbn/investigation-seed';

export const SIGNAL_ANALYZER_AUTHZ = ['apm', 'apm_ml', 'es_delegated'] as const;

export type SignalAnalyzerAuthz = (typeof SIGNAL_ANALYZER_AUTHZ)[number];

export const ANALYZER_RESULT_STATUSES = [
  'found',
  'no_change',
  'indeterminable',
  'skipped',
  'not_applicable',
  'not_set_up',
  'no_access',
] as const;

export type AnalyzerResultStatus = (typeof ANALYZER_RESULT_STATUSES)[number];

export const LEAD_SIGNAL_BANDS = ['strong', 'moderate', 'weak', 'unknown'] as const;
export const LEAD_TIMING_BANDS = ['before', 'during', 'after', 'unknown'] as const;
export const LEAD_RELATIONSHIPS = [
  'service',
  'dependency',
  'host',
  'user',
  'network',
  'unknown',
] as const;

export type LeadSignalBand = (typeof LEAD_SIGNAL_BANDS)[number];
export type LeadTimingBand = (typeof LEAD_TIMING_BANDS)[number];
export type LeadRelationship = (typeof LEAD_RELATIONSHIPS)[number];

/** Structured so the flyout can sort leads without parsing display text. */
export interface LeadRanking {
  signal: LeadSignalBand;
  timing: LeadTimingBand;
  relationship: LeadRelationship;
}

export interface InvestigationLeadShift {
  baseline: number;
  deviation: number;
  kind: 'document_rate';
}

export interface InvestigationLead {
  id: string;
  analyzerId: string;
  summary: string;
  occurredAt?: string;
  relevance: string;
  ranking: LeadRanking;
  shift?: InvestigationLeadShift;
  relatedFields?: readonly string[];
  locatorParams?: Readonly<Record<string, string | number>>;
}

/** Hosts and other context an analyzer passes to a later request. At most 10 values per field. */
export interface AnalyzerEntities {
  'host.name'?: readonly string[];
}

export interface SignalAnalyzerWindowBounds {
  from: string;
  to: string;
}

export interface SignalAnalyzerComparison {
  baseline: SignalAnalyzerWindowBounds;
  deviation: SignalAnalyzerWindowBounds;
}

export const SIGNAL_ANALYZER_PIVOT_FIELDS = [
  'service.name',
  'host.name',
  'user.name',
  'source.ip',
] as const;

export type SignalAnalyzerPivotField = (typeof SIGNAL_ANALYZER_PIVOT_FIELDS)[number];

export interface SignalAnalyzerPivot {
  field: SignalAnalyzerPivotField;
  value: string;
}

export interface SignalAnalyzerResult {
  leads: readonly InvestigationLead[];
  entities?: AnalyzerEntities;
  status: AnalyzerResultStatus;
  message?: string;
  comparison?: SignalAnalyzerComparison;
  pivot?: SignalAnalyzerPivot;
}

export interface AnalyzerApplicability {
  applicable: boolean;
  status?: Exclude<AnalyzerResultStatus, 'found' | 'no_change' | 'indeterminable'>;
  message?: string;
}

/**
 * Request-independent context. Empty until a later step has something to pass that
 * is not already closed over by the analyzer.
 */
export type SignalAnalyzerEnvironment = Record<string, never>;

export interface SignalAnalyzerDeps {
  request: KibanaRequest;
  context: RequestHandlerContext;
}

export interface SignalAnalyzer {
  id: string;
  /** Shown in the coverage list. Not translated here; the registering plugin supplies the label. */
  displayName: string;
  authz: SignalAnalyzerAuthz;
  getApplicability: (
    seed: InvestigationSeed,
    env: SignalAnalyzerEnvironment
  ) => AnalyzerApplicability;
  run: (
    seed: InvestigationSeed,
    deps: SignalAnalyzerDeps,
    abortSignal: AbortSignal
  ) => Promise<SignalAnalyzerResult>;
}

export interface SignalInvestigationServerSetup {
  registerAnalyzer: (analyzer: SignalAnalyzer) => void;
}
