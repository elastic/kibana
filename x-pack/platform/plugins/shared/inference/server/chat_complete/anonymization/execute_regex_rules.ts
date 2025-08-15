/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/inference-common';
import type { DetectedMatch } from './types';
import type { RegexWorkerService } from './regex_worker_service';

/**
 * Executes multiple regex anonymization rules, detecting all matches in the original text
 * without modifying it. Returns match positions and values for later processing.
 */
export async function executeRegexRules({
  records,
  rules,
  regexWorker,
}: {
  records: Array<Record<string, string>>;
  rules: RegexAnonymizationRule[];
  regexWorker: RegexWorkerService;
}): Promise<DetectedMatch[]> {
  return await regexWorker.run({
    rules,
    records,
  });
}
