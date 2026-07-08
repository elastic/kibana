/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceNameSignal } from './constants';

export type RepoType = 'app' | 'iac' | 'both';

export interface LanguageCount {
  language: string;
  count: number;
}

export interface RepoClassification {
  repoType: RepoType;
  isApp: boolean;
  isIac: boolean;
  /** Highest-volume application (programming) language, if any. */
  primaryLanguage?: string;
  languages: LanguageCount[];
}

/**
 * A source-code citation the `scs.code_researcher` agent used to identify a
 * service — the file (and optionally line/snippet) that supports the decision.
 */
export interface CodeEvidenceCitation {
  path: string;
  line?: number;
  snippet?: string;
}

export interface ServiceNameCandidate {
  /** The candidate service name as found in code/config. */
  value: string;
  signal: ServiceNameSignal;
  source: 'iac' | 'app';
  /** Evidence line, e.g. `code: <repo>@<sha>:<file> OTEL_SERVICE_NAME=checkoutservice`. */
  evidence: string;
}

export interface ServiceNameResolution {
  /**
   * The resolved service name. When verified against logs this is the value as
   * it actually appears in `service.name`; otherwise it is the predicted value
   * from code/config.
   */
  value: string;
  confidence: number;
  /** True when the value was not (yet) observed in logs — enables predictive queries. */
  predicted: boolean;
  evidence: string[];
}

/**
 * A single code hit returned by SCS `code_search`, already parsed out of the
 * tool's markdown output.
 */
export interface CodeHit {
  file: string;
  line?: number;
  snippet: string;
}

/**
 * A log-emitting code chunk, retrieved via the `tags: logging` filter that SCS
 * stamps at ingest (elastic/semantic-code-search#168).
 */
export interface LoggingChunk {
  content: string;
  language?: string;
  /** Best-effort file location (from the SCS `_locations` index), when available. */
  location?: string;
}

/**
 * A log statement extracted from a logging chunk: its severity level and the
 * static (non-interpolated) portion of the message used to build a match query.
 */
export interface LogSignature {
  level: string;
  severity: number;
  /** The full literal message as written in code (may contain placeholders). */
  message: string;
  /** The leading static text before any interpolation placeholder. */
  staticPrefix: string;
  location?: string;
}

/**
 * Narrow, injectable surface over the SCS + Elasticsearch reads that code
 * feature identification needs. Kept as an interface so the orchestrator is
 * unit-testable with a fake reader.
 */
export interface CodeRepositoryReader {
  /**
   * A stable change fingerprint for the repository (e.g. `max(updated_at)` over
   * its indexed chunks). Returns `undefined` when the repository is unknown or
   * unreadable.
   */
  getChangeFingerprint(repository: string): Promise<string | undefined>;
  /** Language document-count histogram for the repository. */
  getLanguageHistogram(repository: string): Promise<LanguageCount[]>;
  /** Distinct `service.name` values observed in the given log index/pattern. */
  getObservedServiceNames(index: string): Promise<string[]>;
  /** Semantic code search over the repository. */
  searchCode(repository: string, query: string): Promise<CodeHit[]>;
  /**
   * Log-emitting chunks for the repository (via the `tags: logging` filter).
   * Deterministic enumeration — no semantic ranking.
   */
  getLoggingChunks(repository: string, limit?: number): Promise<LoggingChunk[]>;
  /**
   * Discovers the service directories in a (mono)repo by leveraging the
   * installed SCS `scs.discover_directories` tool, returning derived service
   * names (e.g. `src/checkout` -> `checkout`). Empty when SCS finds none.
   */
  discoverServices(repository: string): Promise<string[]>;
}
