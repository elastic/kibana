/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anonymization, RegexAnonymizationRule } from '@kbn/inference-common';

/**
 * AnonymizationRecord maps JSON Pointer paths to string values that need anonymization.
 * Keys are RFC-6901 JSON Pointer paths (e.g. "/content", "/toolCalls/0/function/arguments").
 *
 * Note: JSON Pointer paths should always contain string values.
 * The undefined is for system messages which may be optional.
 */
export interface AnonymizationRecord {
  [jsonPointerPath: string]: string | undefined;
}

/**
 * AnonymizationState is both the input and the output for executing
 * an anonymization rule.
 */
export interface AnonymizationState {
  records: Array<Record<string, string>>;
  anonymizations: Anonymization[];
}

export interface DetectedMatch {
  recordIndex: number;
  recordKey: string;
  start: number;
  end: number;
  matchValue: string;
  class_name: string;
  ruleIndex: number;
}

export interface AnonymizationRegexWorkerTaskPayload {
  rules: RegexAnonymizationRule[];
  records: Array<Record<string, string>>;
}
