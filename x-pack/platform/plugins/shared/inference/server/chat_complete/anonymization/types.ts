/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Anonymization } from '@kbn/inference-common';

/**
 * AnonymizationRecord are named strings that will be anonymized
 * per key-value pair. This allows us to pass in plain text strings
 * like `content` as a single document, instead of JSON.stringifying
 * the entire message.
 */
export interface AnonymizationRecord {
  // make sure it matches Record<string, string | undefined>
  [x: string]: string | undefined;
  data?: string;
  contentParts?: string;
  content?: string;
  system?: string;
}

/**
 * AnonymizationState is both the input and the output for executing
 * an anonymization rule.
 */
export interface AnonymizationState {
  records: Array<Record<string, string>>;
  anonymizations: Anonymization[];
}
