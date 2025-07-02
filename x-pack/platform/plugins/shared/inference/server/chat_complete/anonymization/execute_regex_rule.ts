/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegexAnonymizationRule } from '@kbn/inference-common';
import { AnonymizationState } from './types';
import { runRegexTask } from './regex_worker';

/**
 * Executes a regex anonymization rule, by iterating over the matches,
 * and replacing each occurrence with a masked value.
 */
export async function executeRegexRule({
  state,
  rule,
}: {
  state: AnonymizationState;
  rule: RegexAnonymizationRule;
}): Promise<AnonymizationState> {
  const { nextRecords, anonymizations } = await runRegexTask({
    rule,
    records: state.records,
  });

  return { records: nextRecords, anonymizations: state.anonymizations.concat(anonymizations) };
}
