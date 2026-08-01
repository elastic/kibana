/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RepoType = 'app' | 'iac' | 'both';

export interface LanguageCount {
  language: string;
  count: number;
}

/** Counts of OTel imports and instrumentation idioms found in service source. */
export interface OtelSignalCounts {
  instrumentation_grpc: number;
  instrumentation_http: number;
  instrumentation_other: number;
  start_span: number;
  set_attribute: number;
  add_event: number;
  record_exception: number;
  set_status_error: number;
  create_metric: number;
}

export interface OtelDetection {
  hasOtel: boolean;
  signalCounts: OtelSignalCounts;
}

export type OtelSignalKind =
  | 'span_name'
  | 'event_name'
  | 'attr_key'
  | 'metric_name'
  | 'error_status'
  | 'record_exception';

export type OtelValueHint = 'bool' | 'number' | 'enum' | 'id' | 'unknown';

/**
 * OTel metric instrument kind, inferred from the constructor call
 * (createCounter / createHistogram / createUpDownCounter / createObservableGauge…).
 * Drives the TSDB-correct aggregation in `generate_otel_queries` — counters need
 * `RATE()`, gauges need `*_OVER_TIME()`. Never `AVG()`/`SUM()` a raw counter.
 */
export type OtelMetricKind = 'counter' | 'histogram' | 'updown' | 'gauge';

/** One source-grounded OTel instrumentation signal. */
export interface OtelSignal {
  kind: OtelSignalKind;
  value?: string;
  valueHint?: OtelValueHint;
  /** Only set for `metric_name` signals — selects the time-series aggregation. */
  metricKind?: OtelMetricKind;
  templated?: boolean;
  language: string;
  file: string;
  line: number;
}

/** A recognized Infrastructure-as-Code technology detected from file paths. */
export type IacKind = 'kubernetes' | 'helm' | 'compose' | 'terraform' | 'pulumi' | 'cloudformation';

/** An IaC signal: the technology detected and an example file evidencing it. */
export interface IacSignal {
  kind: IacKind;
  /** Example repository-relative file path evidencing this signal. */
  path: string;
}

export interface RepoClassification {
  repoType: RepoType;
  isApp: boolean;
  isIac: boolean;
  /** Highest-volume application (programming) language, if any. */
  primaryLanguage?: string;
  languages: LanguageCount[];
  /** IaC file-path signals that contributed to the classification (may be empty). */
  iacSignals: IacSignal[];
}

/**
 * A source-code citation the code-intelligence agent used to identify a
 * service — the file (and optionally line/snippet) that supports the decision.
 */
export interface CodeEvidenceCitation {
  path: string;
  line?: number;
  snippet?: string;
}

/**
 * A log-emitting source excerpt. `content` is a small source window (the matched
 * line +/- 1 neighbor) so multi-line logger calls keep their `logger.x(` context.
 */
export interface LoggingChunk {
  content: string;
  language?: string;
  /** Best-effort repository-relative file and line location. */
  location?: string;
  /**
   * Stage-3 pre-classified signature. When the deterministic regex in
   * {@link extractLogSignatures} cannot parse a `(level, message)` from `content`
   * (a phrase-only match with no logger idiom, e.g. `fmt.Errorf("...")`), the
   * classifier supplies the level + static message so the recall still yields a
   * signature. Idiom chunks leave this unset and are parsed by regex as before.
   */
  classified?: { level: string; message: string };
}

/** How a candidate logging line was surfaced by grep. */
export type LoggingCandidateVia = 'idiom' | 'phrase';

/**
 * A candidate logging line found by deterministic grep, before the classifier
 * decides keep/drop + level. `content` is the +/-1 line window.
 */
export interface LoggingCandidate {
  /** Repository-relative `path:line`. */
  location: string;
  /** The +/-1 line source window. */
  content: string;
  /** Whether a logger idiom matched (high confidence) or only a phrase (needs judging). */
  via: LoggingCandidateVia;
  language?: string;
}

/** An indexed repository ref enumerated from the Sourcerer refs index. */
export interface IndexedRepoRef {
  /** `"org/repo"`. */
  repository: string;
  org: string;
  repo: string;
  /** Immutable commit SHA to scope every subsequent grep to. */
  gitSha: string;
  /** Branch/tag name, if recorded. */
  ref?: string;
}

/**
 * A directory flagged by deterministic marker/manifest grep as a *candidate*
 * deployable service, before the classifier judges + collapses it. Produced by
 * {@link discoverCandidateRoots}; consumed by {@link classifyServices}.
 */
export interface ServiceCandidateRoot {
  /** `"org/repo"`. */
  repository: string;
  gitSha: string;
  /** Repository-relative directory holding the marker(s). */
  serviceRoot: string;
  /** Deploy-marker basenames found in this root (e.g. `Dockerfile`, `go.mod`). */
  markers: string[];
  /** Language implied by the markers (deterministic), or `unknown`. */
  language: string;
  /** Whether an entrypoint signature was found under this root. */
  hasEntrypoint: boolean;
}

/**
 * A logical service after {@link classifyServices} judges candidate roots and
 * collapses environment/region duplicates. Shaped to match the `services[]`
 * items the extraction workflow's `_identify_service` fan-out already consumes.
 */
export interface DiscoveredService {
  repository: string;
  gitSha: string;
  serviceRoot: string;
  name: string;
  language: string;
  repositoryLanguages?: LanguageCount[];
  iacSignals?: IacSignal[];
  hasOtel: boolean;
  signalCounts: OtelSignalCounts;
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
  /**
   * All static (non-interpolated) segments of the message, in source order, with
   * interpolation placeholders removed. A message like
   * `"orderId: {id} total: {n}"` yields `["orderId:", "total:"]`. Used to build a
   * segment-AND predictive query that still matches once the variables are filled
   * at runtime (the collapsed single-phrase form cannot). Always contains at least
   * `staticPrefix` when that is non-trivial.
   */
  staticSegments: string[];
  location?: string;
}
