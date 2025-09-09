/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../../common';
import { ObservabilityPromptBuilder } from './case_prompt_builder/obs/obs_prompt_builder';
import { SecurityPromptBuilder } from './case_prompt_builder/sec/sec_prompt_builder';
import { StackPromptBuilder } from './case_prompt_builder/stack/stack_prompt_builder';

export function getCaseSummaryPrompt(caseData: Case): string {
  switch (caseData.owner) {
    case 'observability':
      return new ObservabilityPromptBuilder(caseData).buildSummary();
    case 'security':
      return new SecurityPromptBuilder(caseData).buildSummary();
    case 'stack':
      return new StackPromptBuilder(caseData).buildSummary();
    default:
      return new StackPromptBuilder(caseData).buildSummary();
  }
}
