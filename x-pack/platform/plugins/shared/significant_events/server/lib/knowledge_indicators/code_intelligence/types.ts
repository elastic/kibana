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
