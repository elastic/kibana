/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_ID_LENGTH = 255;
export const MAX_RULE_NAME_LENGTH = 255;
export const MAX_TITLE_LENGTH = 512;
export const MAX_TEXT_LENGTH = 10_000;
export const MAX_ARRAY_LENGTH = 100;
export const MAX_SIGNAL_DESCRIPTION_LENGTH = 350;
export const MAX_SYMPTOM_HYPOTHESIS_LENGTH = 300;
export const MAX_SUMMARY_LENGTH = 600;
export const MAX_ASSESSMENT_NOTE_LENGTH = 400;

export const SYMPTOM_HYPOTHESIS_ROLE_RULE =
  'This is the causal explanation, not the observed-state report. Use current evidence and selected causal_features to support the mechanism; use blast_radius only to explain evidenced propagation. When evidence does not support a mechanism, state that it is unconfirmed rather than inventing one.';
export const SUMMARY_ROLE_RULE =
  'This is the discovery observation, not a root-cause explanation. Do not assert a causal mechanism or inferred cascade; that belongs in symptom_hypothesis.';

/** Shared narrative-field rule: never let evidence-derived text reproduce a raw sensitive value. */
export const NO_RAW_SENSITIVE_VALUES_RULE =
  'Never quote PII, PCI DSS data, SSNs, credentials, secrets, tokens, or opaque identifiers. Non-sensitive error types, message excerpts, endpoints, and aggregate counts are allowed when they identify the observed condition.';
