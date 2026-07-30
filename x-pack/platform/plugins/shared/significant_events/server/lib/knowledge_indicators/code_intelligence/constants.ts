/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent Builder agent that drives Code Intelligence KI extraction. The workflow
 * reads source through this agent's read-only tools (repo discovery, file reads,
 * regex grep). Today this is the externally-installed **Sourcerer** agent
 * (`sourcerer setup`), whose tools/skills pre-exist independently of this plugin.
 *
 * This is the one swap point for the substrate: when the Agent Builder code
 * sandbox arrives, point this at the sandbox agent id (and retarget the workflow
 * message to its tools). The `code_extraction.yaml` `agent-id` literal must be
 * kept in sync with this value (YAML cannot import a TS constant).
 */
export const CODE_INTELLIGENCE_AGENT_ID = 'sourcerer' as const;

/**
 * Code-derived Feature KIs are stored as `code_analysis` features (reusing the
 * existing computed feature type so no schema enum / UI filter changes are
 * needed) and discriminated by `subtype`.
 */
export const CODE_FEATURE_SUBTYPE_REPO_TYPE = 'repo_type' as const;
export const CODE_FEATURE_SUBTYPE_LANGUAGE = 'language' as const;
export const CODE_FEATURE_SUBTYPE_SERVICE_NAME = 'service_name' as const;

/** `meta` keys used to carry code provenance + change-detection state. */
export const CODE_FEATURE_META_REPOSITORY = 'repository' as const;
export const CODE_FEATURE_META_CHANGE_FINGERPRINT = 'change_fingerprint' as const;

/**
 * Languages that mark a repository (or part of it) as Infrastructure as Code.
 * Kept intentionally narrow for the thin slice; ambiguous markup like generic
 * `yaml` is not included because it is common in application repos too.
 */
export const IAC_LANGUAGES: ReadonlySet<string> = new Set(['hcl', 'terraform', 'tf']);

/**
 * Non-programming languages that should not be considered when picking the
 * primary application language.
 */
export const NON_APP_LANGUAGES: ReadonlySet<string> = new Set([
  ...IAC_LANGUAGES,
  'markdown',
  'md',
  'json',
  'yaml',
  'yml',
  'text',
  'plaintext',
]);

/**
 * Severity level of a log call mapped to a KI query severity score (0-100).
 * Derived from the logger method name in the code (deterministic), not from log
 * frequency — predictive queries have no occurrences to score against.
 */
export const LOG_LEVEL_SEVERITY: Record<string, number> = {
  fatal: 80,
  critical: 80,
  severe: 80,
  error: 70,
  warn: 50,
  warning: 50,
  info: 30,
  debug: 20,
  trace: 20,
  fine: 20,
};

/** Default severity for a recognized log call whose level is not in the map. */
export const DEFAULT_LOG_SEVERITY = 40;
