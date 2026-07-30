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
 * A log-emitting source excerpt verified by the GitHub code research agent.
 */
export interface LoggingChunk {
  content: string;
  language?: string;
  /** Best-effort repository-relative file and line location. */
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
